import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const TEAM_CALENDARS: Record<number, string> = {
  14: "30f097925245f0a2a0835cb2309c9370975d62eda1ca54faea63435892dd36b2@group.calendar.google.com",
  16: "8531cf33e94556ea6180bbd1231262fcc7199e35ca56bbc198545f30439c245e@group.calendar.google.com",
};

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

function resolveTeam(searchParams: URLSearchParams, userTeam?: number | null): number {
  const teamParam = searchParams.get("team");
  if (teamParam) return parseInt(teamParam);
  // Backward compat: default to user's team, or 16 for cron
  if (userTeam && TEAM_CALENDARS[userTeam]) return userTeam;
  return 16;
}

// POST — sync team Google Calendar → ScheduleEvent
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get("secret");
  const isCron = cronSecret === process.env.CRON_SECRET;

  let teamNumber: number;

  if (isCron) {
    teamNumber = resolveTeam(searchParams);
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, team: true } });
    teamNumber = resolveTeam(searchParams, user?.team);
    if (user?.team !== teamNumber && user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
  }

  const calendarId = TEAM_CALENDARS[teamNumber];
  if (!calendarId) {
    return NextResponse.json({ error: `אין יומן מוגדר לצוות ${teamNumber}` }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "חסר מפתח Google API" }, { status: 500 });
  }

  const TARGET = `team-${teamNumber}`;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const now = new Date();
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const fetchGCal = async (): Promise<GCalEvent[]> => {
    const allEvents: GCalEvent[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        key: API_KEY!,
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "2500",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
      const res = await fetch(url, { cache: "no-store" });
      const data: GCalResponse = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      if (data.items) allEvents.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
    return allEvents;
  };

  let allGCalEvents: GCalEvent[];
  let beforeEvents: { title: string; startTime: Date; endTime: Date; allDay: boolean }[];
  let teamUsers: { id: string; name: string }[];
  let teamEventIds: { id: string }[];

  try {
    const [gcal, before, users, ids] = await Promise.all([
      fetchGCal(),
      prisma.scheduleEvent.findMany({
        where: { target: TARGET, startTime: { lt: todayEnd }, endTime: { gt: todayStart } },
        select: { title: true, startTime: true, endTime: true, allDay: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.user.findMany({
        where: { team: teamNumber },
        select: { id: true, name: true },
      }),
      prisma.scheduleEvent.findMany({
        where: { target: TARGET },
        select: { id: true },
      }),
    ]);
    allGCalEvents = gcal;
    beforeEvents = before;
    teamUsers = users;
    teamEventIds = ids;
  } catch (err) {
    console.error(`Failed to fetch team ${teamNumber} calendar:`, err);
    return NextResponse.json({ error: `שגיאה בטעינת יומן הצוות: ${err}` }, { status: 502 });
  }

  const beforeSet = new Map<string, { title: string; startTime: Date; endTime: Date; allDay: boolean }>();
  for (const e of beforeEvents) {
    beforeSet.set(`${e.title}|${e.startTime.toISOString()}|${e.allDay}`, e);
  }

  const activeEvents = allGCalEvents.filter(e => e.status !== "cancelled");

  const parsed = activeEvents.map(e => {
    const allDay = !e.start.dateTime;
    const startTime = e.start.dateTime
      ? new Date(e.start.dateTime)
      : new Date(e.start.date + "T00:00:00+03:00");
    const endTime = e.end.dateTime
      ? new Date(e.end.dateTime)
      : new Date(e.end.date + "T00:00:00+03:00");

    const title = e.summary || "ללא כותרת";
    const titleNorm = title.replace(/[־\-–—]/g, " ");
    const descNorm = (e.description || "").replace(/[־\-–—]/g, " ");
    const searchText = `${titleNorm} ${descNorm}`;
    const matchedUsers = teamUsers.filter(u => {
      if (!u.name) return false;
      if (searchText.includes(u.name)) return true;
      const nameParts = u.name.split(/\s+/).filter(p => p.length > 1);
      if (nameParts.length < 2) return false;
      return nameParts.every(part => searchText.includes(part));
    });

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

  if (teamEventIds.length > 0) {
    await prisma.$transaction([
      prisma.scheduleAssignee.deleteMany({
        where: { eventId: { in: teamEventIds.map(e => e.id) } },
      }),
      prisma.scheduleEvent.deleteMany({ where: { target: TARGET } }),
    ]);
  }

  const eventsWithAssignees = parsed.filter(e => e.matchedUserIds.length > 0);
  const eventsWithout = parsed.filter(e => e.matchedUserIds.length === 0);

  if (eventsWithout.length > 0) {
    await prisma.scheduleEvent.createMany({
      data: eventsWithout.map(({ matchedUserIds: _, ...d }) => d),
    });
  }

  let assignedCount = 0;
  if (eventsWithAssignees.length > 0) {
    const creates = eventsWithAssignees.map(({ matchedUserIds: _, ...d }) =>
      prisma.scheduleEvent.create({ data: d })
    );
    const createdEvents = await prisma.$transaction(creates);

    const assigneeData: { eventId: string; userId: string }[] = [];
    for (let i = 0; i < createdEvents.length; i++) {
      for (const uid of eventsWithAssignees[i].matchedUserIds) {
        assigneeData.push({ eventId: createdEvents[i].id, userId: uid });
      }
    }
    if (assigneeData.length > 0) {
      await prisma.scheduleAssignee.createMany({ data: assigneeData });
      assignedCount = assigneeData.length;
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

  const rawAdded: { title: string; startTime: Date; endTime: Date; allDay: boolean }[] = [];
  const rawRemoved: { title: string; startTime: Date; endTime: Date; allDay: boolean }[] = [];

  for (const [key, e] of afterSet) {
    if (!beforeSet.has(key)) rawAdded.push(e);
  }
  for (const [key, e] of beforeSet) {
    if (!afterSet.has(key)) rawRemoved.push(e);
  }

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
    assigned: assignedCount,
    message: `סונכרנו ${parsed.length} אירועים מיומן צוות ${teamNumber}`,
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

// PUT — notify team users about changes
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, team: true } });

  const { searchParams } = new URL(req.url);
  const teamNumber = resolveTeam(searchParams, user?.team);

  if (user?.team !== teamNumber && user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { changes } = await req.json();
  if (!changes) return NextResponse.json({ error: "חסר תוכן" }, { status: 400 });

  const { sendPushToUsers } = await import("@/lib/push");

  const teamUsers = await prisma.user.findMany({
    where: { team: teamNumber },
    select: { id: true },
  });

  if (teamUsers.length > 0) {
    await sendPushToUsers(teamUsers.map(u => u.id), {
      title: `עדכון לו"ז צוות ${teamNumber}`,
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
