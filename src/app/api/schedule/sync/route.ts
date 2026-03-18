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

// POST — sync Google Calendar → ScheduleEvent (admin only)
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "חסר מפתח Google API" }, { status: 500 });
  }

  // Fetch events from Google Calendar API
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const allEvents: GCalEvent[] = [];
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

      if (data.items) allEvents.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error("Failed to fetch calendar:", err);
    return NextResponse.json({ error: "שגיאה בטעינת היומן" }, { status: 502 });
  }

  // Filter out cancelled events
  const activeEvents = allEvents.filter(e => e.status !== "cancelled");

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

  // Delete all existing schedule events (full sync)
  await prisma.scheduleAssignee.deleteMany({});
  await prisma.scheduleEvent.deleteMany({});

  // Insert new events
  if (parsed.length > 0) {
    await prisma.scheduleEvent.createMany({ data: parsed });
  }

  return NextResponse.json({
    success: true,
    synced: parsed.length,
    message: `סונכרנו ${parsed.length} אירועים מיומן Google`,
  });
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
