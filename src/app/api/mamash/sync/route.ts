import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import {
  TEAM_CALENDARS, getAccessToken,
  createGoogleEvent, patchGoogleEvent,
} from "@/lib/google-calendar";
import { israelToday } from "@/lib/israel-tz";

/**
 * POST — One-button calendar sync for a team's daily schedule.
 *
 * Finds all team events for the given date and syncs them to Google Calendar:
 *   - New events (no googleEventId) → CREATE in Google Calendar
 *   - Changed events (calendarSynced=false, has googleEventId) → PATCH in Google Calendar
 *   - Cancelled events are handled separately via baltam cancel (sets Google status to "cancelled")
 *
 * After successful sync, sends push notifications to all assignees whose events
 * were created or changed since last notification.
 *
 * Body: { team: number, date: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { team, date } = body;

  if (!team || !date) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  // Verify ממ״ש or admin
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  const mamashRole = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  if (!isAdmin && !mamashRole) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const calendarId = TEAM_CALENDARS[team as number];
  if (!calendarId) return NextResponse.json({ error: "צוות לא מוכר" }, { status: 400 });

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json({
      error: "כתיבה ליומן Google לא מוגדרת. יש להגדיר GOOGLE_SERVICE_ACCOUNT_KEY.",
      needsSetup: true,
    }, { status: 501 });
  }

  // Safety: only sync today or future dates, never past
  const todayStr = israelToday();
  if (date < todayStr) {
    return NextResponse.json({ error: "אי אפשר לסנכרן תאריכים שעברו" }, { status: 400 });
  }

  // Get all team events for this date that need syncing
  const { israelDayRange } = await import("@/lib/israel-tz");
  const { dayStart, dayEnd } = israelDayRange(date);

  const events = await prisma.scheduleEvent.findMany({
    where: {
      target: `team-${team}`,
      startTime: { lte: dayEnd },
      endTime: { gt: dayStart },
      allDay: false, // Only sync timed events, not all-day markers
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { startTime: "asc" },
  });

  // Split into: needs create, needs update, already synced
  // - toCreate: no googleEventId yet → INSERT into Google Calendar
  // - toUpdate: has googleEventId but changed since last sync → PATCH
  // - alreadySynced: no changes needed
  const toCreate = events.filter(e => !e.googleEventId && !e.calendarSynced);
  const toUpdate = events.filter(e => e.googleEventId && !e.calendarSynced);
  const alreadySynced = events.filter(e => e.calendarSynced);

  if (toCreate.length === 0 && toUpdate.length === 0) {
    return NextResponse.json({
      ok: true,
      created: 0,
      updated: 0,
      alreadySynced: alreadySynced.length,
      notified: 0,
      message: "הכל כבר מסונכרן",
    });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    return NextResponse.json({
      error: `שגיאת אימות Google: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }

  const results = { created: 0, updated: 0, errors: [] as string[] };
  const notifyUserIds = new Set<string>();
  const notifyDetails: { userId: string; eventTitle: string; action: string; time: string }[] = [];

  const toISO = (d: Date) => d.toISOString();
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

  // Create new events in Google Calendar
  for (const event of toCreate) {
    try {
      const { googleEventId } = await createGoogleEvent(accessToken, calendarId, {
        title: event.title,
        description: event.description || undefined,
        startTime: toISO(event.startTime),
        endTime: toISO(event.endTime),
        allDay: event.allDay,
      });

      await prisma.scheduleEvent.update({
        where: { id: event.id },
        data: { googleEventId, calendarSynced: true, notifiedAt: new Date() },
      });

      results.created++;

      // Track assignees to notify
      for (const a of event.assignees) {
        notifyUserIds.add(a.userId);
        notifyDetails.push({
          userId: a.userId,
          eventTitle: event.title,
          action: "new",
          time: `${fmtTime(event.startTime)}–${fmtTime(event.endTime)}`,
        });
      }
    } catch (err) {
      results.errors.push(`${event.title}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update changed events in Google Calendar
  for (const event of toUpdate) {
    try {
      await patchGoogleEvent(accessToken, calendarId, event.googleEventId!, {
        title: event.title,
        description: event.description || undefined,
        startTime: toISO(event.startTime),
        endTime: toISO(event.endTime),
      });

      await prisma.scheduleEvent.update({
        where: { id: event.id },
        data: { calendarSynced: true, notifiedAt: new Date() },
      });

      results.updated++;

      // Track assignees to notify
      for (const a of event.assignees) {
        notifyUserIds.add(a.userId);
        notifyDetails.push({
          userId: a.userId,
          eventTitle: event.title,
          action: "updated",
          time: `${fmtTime(event.startTime)}–${fmtTime(event.endTime)}`,
        });
      }
    } catch (err) {
      results.errors.push(`${event.title}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Send notifications to affected assignees (grouped per user)
  let notifiedCount = 0;
  if (notifyUserIds.size > 0) {
    // Group events by user for a cleaner notification
    const byUser = new Map<string, typeof notifyDetails>();
    for (const d of notifyDetails) {
      if (!byUser.has(d.userId)) byUser.set(d.userId, []);
      byUser.get(d.userId)!.push(d);
    }

    for (const [uid, details] of byUser) {
      const lines = details.map(d =>
        d.action === "new" ? `${d.eventTitle} (${d.time})` : `עודכן: ${d.eventTitle} (${d.time})`
      );
      const body = lines.length <= 3
        ? lines.join("\n")
        : `${lines.slice(0, 2).join("\n")}\n+${lines.length - 2} נוספים`;

      try {
        await sendPushToUsers([uid], {
          title: `עדכון לו״ז צוות ${team}`,
          body,
          url: "/schedule-daily",
          tag: `sync-${date}`,
        });
        notifiedCount++;
      } catch {
        // Non-critical — continue
      }
    }
  }

  return NextResponse.json({
    ok: results.errors.length === 0,
    created: results.created,
    updated: results.updated,
    alreadySynced: alreadySynced.length,
    notified: notifiedCount,
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}
