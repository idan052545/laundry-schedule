import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const CALENDAR_ID =
  "7590b2db7ff25ede43ffcec312f64af8ff12a5baa4703494c765c1c8cca0d72f@group.calendar.google.com";
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

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

// POST — sync Google Calendar → ScheduleEvent (admin or cron)
export async function POST(req: Request) {
  // Allow cron secret bypass
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get("secret");
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
    if (user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "חסר מפתח Google API" }, { status: 500 });
  }

  // Snapshot today's events BEFORE sync
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Get all events overlapping with today (starts before tomorrow AND ends after today start)
  const beforeEvents = await prisma.scheduleEvent.findMany({
    where: {
      target: "all",
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

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;
      const res = await fetch(url, { cache: "no-store" });
      const data: GCalResponse = await res.json();

      if (!res.ok) {
        console.error("Google Calendar API error:", data.error);
        return NextResponse.json({
          error: `שגיאה מ-Google: ${data.error?.message || res.status}`,
        }, { status: 502 });
      }

      if (data.items) allGCalEvents.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error("Failed to fetch calendar:", err);
    return NextResponse.json({ error: "שגיאה בטעינת היומן" }, { status: 502 });
  }

  // Filter out cancelled events
  const activeEvents = allGCalEvents.filter(e => e.status !== "cancelled");

  // Parse into our format
  const parsed = activeEvents.map(e => {
    const allDay = !e.start.dateTime;
    const startTime = e.start.dateTime
      ? new Date(e.start.dateTime)
      : new Date(e.start.date + "T00:00:00+03:00");
    const endTime = e.end.dateTime
      ? new Date(e.end.dateTime)
      : new Date(e.end.date + "T00:00:00+03:00");

    return {
      title: e.summary || "ללא כותרת",
      description: e.description || null,
      startTime,
      endTime,
      allDay,
      target: "all" as const,
      type: guessType(e.summary || ""),
    };
  }).filter(e => !isNaN(e.startTime.getTime()) && !isNaN(e.endTime.getTime()));

  // Delete existing platoon (target="all") events only — preserve team events
  const platoonEventIds = await prisma.scheduleEvent.findMany({
    where: { target: "all" },
    select: { id: true },
  });
  if (platoonEventIds.length > 0) {
    await prisma.scheduleAssignee.deleteMany({
      where: { eventId: { in: platoonEventIds.map(e => e.id) } },
    });
    await prisma.scheduleEvent.deleteMany({ where: { target: "all" } });
  }

  // Insert new events
  if (parsed.length > 0) {
    await prisma.scheduleEvent.createMany({ data: parsed });
  }

  // Compute today's diff
  const afterTodayEvents = parsed.filter(e => {
    if (e.allDay) {
      return e.startTime <= todayEnd && e.endTime > todayStart;
    }
    return e.startTime < todayEnd && e.endTime > todayStart;
  });

  const afterSet = new Map<string, typeof parsed[0]>();
  for (const e of afterTodayEvents) {
    afterSet.set(`${e.title}|${e.startTime.toISOString()}|${e.allDay}`, e);
  }

  // Collect raw added/removed by key
  const rawAdded: { title: string; startTime: Date; endTime: Date; allDay: boolean }[] = [];
  const rawRemoved: { title: string; startTime: Date; endTime: Date; allDay: boolean }[] = [];

  for (const [key, e] of afterSet) {
    if (!beforeSet.has(key)) rawAdded.push(e);
  }
  for (const [key, e] of beforeSet) {
    if (!afterSet.has(key)) rawRemoved.push(e);
  }

  // Detect updates: same title in both added & removed = time changed
  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];
  const matchedAddedIdx = new Set<number>();
  const matchedRemovedIdx = new Set<number>();

  for (let ri = 0; ri < rawRemoved.length; ri++) {
    for (let ai = 0; ai < rawAdded.length; ai++) {
      if (matchedAddedIdx.has(ai)) continue;
      if (rawRemoved[ri].title === rawAdded[ai].title && rawRemoved[ri].allDay === rawAdded[ai].allDay) {
        const r = rawRemoved[ri];
        const a = rawAdded[ai];
        const oldTime = r.allDay ? "כל היום" : `${formatTime(r.startTime)}–${formatTime(r.endTime)}`;
        const newTime = a.allDay ? "כל היום" : `${formatTime(a.startTime)}–${formatTime(a.endTime)}`;
        updated.push(`${a.title} (${oldTime} ← ${newTime})`);
        matchedAddedIdx.add(ai);
        matchedRemovedIdx.add(ri);
        break;
      }
    }
  }

  for (let ai = 0; ai < rawAdded.length; ai++) {
    if (!matchedAddedIdx.has(ai)) {
      const e = rawAdded[ai];
      added.push(e.allDay ? `${e.title} (כל היום)` : `${e.title} (${formatTime(e.startTime)}–${formatTime(e.endTime)})`);
    }
  }
  for (let ri = 0; ri < rawRemoved.length; ri++) {
    if (!matchedRemovedIdx.has(ri)) {
      const e = rawRemoved[ri];
      removed.push(e.allDay ? `${e.title} (כל היום)` : `${e.title} (${formatTime(e.startTime)}–${formatTime(e.endTime)})`);
    }
  }

  return NextResponse.json({
    success: true,
    synced: parsed.length,
    message: `סונכרנו ${parsed.length} אירועים מיומן Google`,
    todayDiff: {
      added,
      removed,
      updated,
      unchanged: added.length === 0 && removed.length === 0 && updated.length === 0,
    },
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

// PUT — notify all users about changes
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { changes } = await req.json();
  if (!changes) return NextResponse.json({ error: "חסר תוכן" }, { status: 400 });

  // Dynamic import to avoid bundling issues
  const { sendPushToAll } = await import("@/lib/push");
  await sendPushToAll({
    title: 'עדכון לו"ז היום',
    body: changes,
    url: "/schedule-daily",
  });

  return NextResponse.json({ success: true });
}

// GET — check sync status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const count = await prisma.scheduleEvent.count();
  const latest = await prisma.scheduleEvent.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });

  return NextResponse.json({
    eventCount: count,
    lastUpdated: latest?.updatedAt || null,
  });
}

// Guess event type from Hebrew title keywords
function guessType(title: string): string {
  if (/ארוחת|ארוחה|אוכל|בוקר|צהריים|ערב|כריך/.test(title)) return "meal";
  if (/אימון|כושר|ספורט|ריצה/.test(title)) return "training";
  if (/טקס|מסדר|דגל/.test(title)) return "ceremony";
  if (/חופש|פנאי|זמן אישי|זמן חופשי/.test(title)) return "free";
  return "general";
}
