import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const TEAM16_CALENDAR_ID =
  "8531cf33e94556ea6180bbd1231262fcc7199e35ca56bbc198545f30439c245e@group.calendar.google.com";
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const TEAM_NUMBER = 16;
const TARGET = `team-${TEAM_NUMBER}`;

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
}

interface GCalResponse {
  items?: GCalEvent[];
  nextPageToken?: string;
  error?: { message: string; code: number };
}

// POST — sync Team 16 Google Calendar → ScheduleEvent
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, team: true } });

  // Only team 16 members, admins, or ohad can sync
  if (user?.team !== TEAM_NUMBER && user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "חסר מפתח Google API" }, { status: 500 });
  }

  // Snapshot today's team events BEFORE sync
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const beforeEvents = await prisma.scheduleEvent.findMany({
    where: {
      target: TARGET,
      startTime: { lt: todayEnd },
      endTime: { gt: todayStart },
    },
    select: { title: true, startTime: true, endTime: true, allDay: true },
    orderBy: { startTime: "asc" },
  });
  const beforeSet = new Map<string, { title: string; startTime: Date; endTime: Date; allDay: boolean }>();
  for (const e of beforeEvents) {
    beforeSet.set(`${e.title}|${e.startTime.toISOString()}|${e.allDay}`, e);
  }

  // Fetch events from Google Calendar API
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const allGCalEvents: GCalEvent[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const params = new URLSearchParams({
        key: API_KEY,
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "2500",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(TEAM16_CALENDAR_ID)}/events?${params}`;
      const res = await fetch(url, { cache: "no-store" });
      const data: GCalResponse = await res.json();

      if (!res.ok) {
        console.error("Google Calendar API error (team 16):", data.error);
        return NextResponse.json({
          error: `שגיאה מ-Google: ${data.error?.message || res.status}`,
        }, { status: 502 });
      }

      if (data.items) allGCalEvents.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error("Failed to fetch team 16 calendar:", err);
    return NextResponse.json({ error: "שגיאה בטעינת יומן הצוות" }, { status: 502 });
  }

  // Filter out cancelled events
  const activeEvents = allGCalEvents.filter(e => e.status !== "cancelled");

  // Get all team 16 users for name matching
  const teamUsers = await prisma.user.findMany({
    where: { team: TEAM_NUMBER },
    select: { id: true, name: true },
  });

  // Parse into our format
  const parsed = activeEvents.map(e => {
    const allDay = !e.start.dateTime;
    const startTime = e.start.dateTime
      ? new Date(e.start.dateTime)
      : new Date(e.start.date + "T00:00:00+03:00");
    const endTime = e.end.dateTime
      ? new Date(e.end.dateTime)
      : new Date(e.end.date + "T00:00:00+03:00");

    // Find users whose name appears in the event title
    const title = e.summary || "ללא כותרת";
    const matchedUsers = teamUsers.filter(u =>
      u.name && title.includes(u.name)
    );

    return {
      title,
      description: e.description || null,
      startTime,
      endTime,
      allDay,
      target: TARGET,
      type: guessType(title),
      matchedUserIds: matchedUsers.map(u => u.id),
    };
  }).filter(e => !isNaN(e.startTime.getTime()) && !isNaN(e.endTime.getTime()));

  // Delete existing team 16 events only (not platoon events)
  // First delete assignees for team events, then the events themselves
  const teamEventIds = await prisma.scheduleEvent.findMany({
    where: { target: TARGET },
    select: { id: true },
  });
  if (teamEventIds.length > 0) {
    await prisma.scheduleAssignee.deleteMany({
      where: { eventId: { in: teamEventIds.map(e => e.id) } },
    });
    await prisma.scheduleEvent.deleteMany({ where: { target: TARGET } });
  }

  // Insert new events and create assignees
  let assignedCount = 0;
  for (const event of parsed) {
    const { matchedUserIds, ...eventData } = event;
    const created = await prisma.scheduleEvent.create({ data: eventData });

    if (matchedUserIds.length > 0) {
      await prisma.scheduleAssignee.createMany({
        data: matchedUserIds.map(uid => ({
          eventId: created.id,
          userId: uid,
        })),
      });
      assignedCount += matchedUserIds.length;
    }
  }

  // Compute today's diff
  const afterTodayEvents = parsed.filter(e => {
    return e.startTime < todayEnd && e.endTime > todayStart;
  });

  const afterSet = new Map<string, typeof parsed[0]>();
  for (const e of afterTodayEvents) {
    afterSet.set(`${e.title}|${e.startTime.toISOString()}|${e.allDay}`, e);
  }

  const added: string[] = [];
  const removed: string[] = [];

  for (const [key, e] of afterSet) {
    if (!beforeSet.has(key)) {
      added.push(e.allDay ? `${e.title} (כל היום)` : `${e.title} (${formatTime(e.startTime)}–${formatTime(e.endTime)})`);
    }
  }
  for (const [key, e] of beforeSet) {
    if (!afterSet.has(key)) {
      removed.push(e.allDay ? `${e.title} (כל היום)` : `${e.title} (${formatTime(e.startTime)}–${formatTime(e.endTime)})`);
    }
  }

  return NextResponse.json({
    success: true,
    synced: parsed.length,
    assigned: assignedCount,
    message: `סונכרנו ${parsed.length} אירועים מיומן צוות ${TEAM_NUMBER}`,
    todayDiff: {
      added,
      removed,
      unchanged: added.length === 0 && removed.length === 0,
    },
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

// PUT — notify team 16 users about changes
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, team: true } });
  if (user?.team !== TEAM_NUMBER && user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { changes } = await req.json();
  if (!changes) return NextResponse.json({ error: "חסר תוכן" }, { status: 400 });

  const { sendPushToUsers } = await import("@/lib/push");

  // Get all team 16 user IDs
  const teamUsers = await prisma.user.findMany({
    where: { team: TEAM_NUMBER },
    select: { id: true },
  });

  if (teamUsers.length > 0) {
    await sendPushToUsers(teamUsers.map(u => u.id), {
      title: `עדכון לו"ז צוות ${TEAM_NUMBER}`,
      body: changes,
      url: "/schedule-daily",
    });
  }

  return NextResponse.json({ success: true });
}

// Guess event type from Hebrew title keywords
function guessType(title: string): string {
  if (/ארוחת|ארוחה|אוכל|בוקר|צהריים|ערב|כריך/.test(title)) return "meal";
  if (/אימון|כושר|ספורט|ריצה/.test(title)) return "training";
  if (/טקס|מסדר|דגל/.test(title)) return "ceremony";
  if (/חופש|פנאי|זמן אישי|זמן חופשי/.test(title)) return "free";
  return "general";
}
