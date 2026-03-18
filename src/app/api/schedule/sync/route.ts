import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const CALENDAR_ID =
  "7590b2db7ff25ede43ffcec312f64af8ff12a5baa4703494c765c1c8cca0d72f@group.calendar.google.com";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;

interface ParsedEvent {
  uid: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
}

// Minimal iCal parser — handles VEVENT blocks
function parseICS(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines = unfoldLines(block);

    const props: Record<string, string> = {};
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.substring(0, colonIdx);
      const val = line.substring(colonIdx + 1);
      // Strip params like DTSTART;VALUE=DATE → DTSTART
      const baseKey = key.split(";")[0].trim();
      props[baseKey] = val.trim();
    }

    const uid = props["UID"] || `evt-${i}`;
    const summary = unescapeICS(props["SUMMARY"] || "ללא כותרת");
    const description = props["DESCRIPTION"] ? unescapeICS(props["DESCRIPTION"]) : null;

    // Parse dates
    const dtStart = props["DTSTART"];
    const dtEnd = props["DTEND"];
    if (!dtStart) continue;

    const allDay = !dtStart.includes("T");
    const start = parseICSDate(dtStart);
    const end = dtEnd ? parseICSDate(dtEnd) : (allDay ? new Date(start.getTime() + 86400000) : new Date(start.getTime() + 3600000));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    events.push({ uid, title: summary, description, startTime: start, endTime: end, allDay });
  }

  return events;
}

// Unfold iCal continuation lines (lines starting with space/tab)
function unfoldLines(text: string): string[] {
  const raw = text.split(/\r?\n/);
  const result: string[] = [];
  for (const line of raw) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (result.length > 0) result[result.length - 1] += line.substring(1);
    } else {
      result.push(line);
    }
  }
  return result;
}

// Parse iCal date: 20260318 or 20260318T090000 or 20260318T090000Z
function parseICSDate(s: string): Date {
  const clean = s.replace(/[^0-9TZ]/g, "");
  if (clean.length === 8) {
    // Date only: YYYYMMDD — treat as midnight in Israel timezone
    return new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00+03:00`);
  }
  const tIdx = clean.indexOf("T");
  if (tIdx === -1) return new Date(NaN);
  const datePart = clean.slice(0, tIdx);
  const timePart = clean.slice(tIdx + 1).replace("Z", "");
  const iso = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}T${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`;
  // If original had Z, it's UTC; otherwise assume Israel time
  if (clean.endsWith("Z")) return new Date(iso + "Z");
  return new Date(iso + "+03:00");
}

function unescapeICS(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\").replace(/\\;/g, ";");
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

  // Fetch iCal feed
  let icsText: string;
  try {
    const res = await fetch(ICAL_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (err) {
    console.error("Failed to fetch calendar:", err);
    return NextResponse.json({ error: "שגיאה בטעינת היומן" }, { status: 502 });
  }

  // Parse events
  const allParsed = parseICS(icsText);

  // Filter: 30 days back to 60 days ahead
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAhead = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const parsed = allParsed.filter(e => e.startTime >= thirtyDaysAgo && e.startTime <= sixtyDaysAhead);

  // Delete all existing schedule events (full sync)
  await prisma.scheduleAssignee.deleteMany({});
  await prisma.scheduleEvent.deleteMany({});

  // Insert new events
  if (parsed.length > 0) {
    await prisma.scheduleEvent.createMany({
      data: parsed.map(e => ({
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        allDay: e.allDay,
        target: "all",
        type: guessType(e.title),
      })),
    });
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
  const t = title;
  if (/ארוחת|ארוחה|אוכל|בוקר|צהריים|ערב|כריך/.test(t)) return "meal";
  if (/אימון|כושר|ספורט|ריצה/.test(t)) return "training";
  if (/טקס|מסדר|דגל/.test(t)) return "ceremony";
  if (/חופש|פנאי|זמן אישי|זמן חופשי/.test(t)) return "free";
  return "general";
}
