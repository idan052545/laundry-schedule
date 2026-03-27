import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAccessToken, deleteGoogleEvent, TEAM_CALENDARS } from "@/lib/google-calendar";
import { israelToday } from "@/lib/israel-tz";

async function verifyMamash(userId: string, team: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  if (isAdmin) return true;
  const role = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  return !!role;
}

/**
 * Baltam (unplanned changes) handler.
 *
 * Changes are saved to DB and events marked as calendarSynced=false.
 * Push notifications are NOT sent here — they happen when the ממ״ש
 * presses the sync button, which writes to Google Calendar and then notifies.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { action, team } = body;

  if (!action || !team) return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });

  const hasAccess = await verifyMamash(userId, team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const today = israelToday();

  if (action === "reschedule") {
    const { eventId, newStartTime, newEndTime, reason } = body;
    if (!eventId || !newStartTime || !newEndTime) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.findUnique({
      where: { id: eventId },
      include: { assignees: { select: { userId: true } } },
    });
    if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    const assigneeIds = event.assignees.map(a => a.userId);
    const newStart = new Date(newStartTime);
    const newEnd = new Date(newEndTime);

    // Detect ALL team-16 event collisions (not just assignee conflicts)
    const teamCollisions = await prisma.scheduleEvent.findMany({
      where: {
        id: { not: eventId },
        target: `team-${team}`,
        allDay: false,
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { startTime: "asc" },
    });

    if (teamCollisions.length > 0 && !body.force && !body.autoResolve) {
      // Compute smart resolution suggestions for each collision
      const suggestions = teamCollisions.map(c => {
        const overlapMs = Math.min(newEnd.getTime(), c.endTime.getTime()) - Math.max(newStart.getTime(), c.startTime.getTime());
        const overlapMin = Math.ceil(overlapMs / 60000);
        const cDuration = Math.round((c.endTime.getTime() - c.startTime.getTime()) / 60000);
        return {
          eventId: c.id,
          eventTitle: c.title,
          startTime: c.startTime,
          endTime: c.endTime,
          assignees: c.assignees.map(a => ({ id: a.user.id, name: a.user.name })),
          overlapMinutes: overlapMin,
          resolutions: [
            // Push forward: shift colliding event to start after our new end
            {
              type: "shift-forward" as const,
              label: `דחה ב-${overlapMin} דק'`,
              newStartTime: newEnd.toISOString(),
              newEndTime: new Date(c.endTime.getTime() + overlapMs).toISOString(),
            },
            // Shorten: trim colliding event's start
            ...(cDuration > overlapMin ? [{
              type: "trim-start" as const,
              label: `קצר תחילה ב-${overlapMin} דק'`,
              newStartTime: newEnd.toISOString(),
              newEndTime: c.endTime.toISOString(),
            }] : []),
            // Swap times: put our event where the collision is and vice versa
            {
              type: "swap-times" as const,
              label: "החלף זמנים",
              newStartTime: c.startTime.toISOString(),
              newEndTime: c.endTime.toISOString(),
            },
          ],
        };
      });

      return NextResponse.json({ teamCollisions: suggestions }, { status: 409 });
    }

    // If autoResolve is provided, apply resolutions to colliding events
    if (body.autoResolve && Array.isArray(body.autoResolve)) {
      for (const resolution of body.autoResolve as Array<{ eventId: string; newStartTime: string; newEndTime: string }>) {
        await prisma.scheduleEvent.update({
          where: { id: resolution.eventId },
          data: {
            startTime: new Date(resolution.newStartTime),
            endTime: new Date(resolution.newEndTime),
            calendarSynced: false,
          },
        });
        const resolvedEvent = await prisma.scheduleEvent.findUnique({ where: { id: resolution.eventId }, select: { title: true } });
        await prisma.scheduleChange.create({
          data: {
            eventId: resolution.eventId,
            team,
            date: today,
            changeType: "reschedule",
            description: `הוזז אוטומטית: ${resolvedEvent?.title || ""}`,
            newData: JSON.stringify({ startTime: resolution.newStartTime, endTime: resolution.newEndTime }),
            reason: `בעקבות הזזת ${event.title}`,
            createdById: userId,
          },
        });
      }
    }

    const previousData = JSON.stringify({
      startTime: event.startTime,
      endTime: event.endTime,
    });

    // Update event + mark as unsynced
    await prisma.scheduleEvent.update({
      where: { id: eventId },
      data: { startTime: newStart, endTime: newEnd, calendarSynced: false },
    });

    await prisma.scheduleChange.create({
      data: {
        eventId,
        team,
        date: today,
        changeType: "reschedule",
        description: `הוזז: ${event.title}`,
        previousData,
        newData: JSON.stringify({ startTime: newStartTime, endTime: newEndTime }),
        reason: reason || null,
        affectedUserIds: JSON.stringify(assigneeIds),
        createdById: userId,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    const { eventId, reason } = body;
    if (!eventId) return NextResponse.json({ error: "חסר eventId" }, { status: 400 });

    const event = await prisma.scheduleEvent.findUnique({
      where: { id: eventId },
      include: { assignees: { select: { userId: true } } },
    });
    if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    const assigneeIds = event.assignees.map(a => a.userId);

    // If synced to Google Calendar, delete it there too —
    // but ONLY if the event is for today or future (never touch past dates)
    if (event.googleEventId) {
      const eventDate = event.startTime.toISOString().split("T")[0];
      const todayStr = israelToday();
      if (eventDate >= todayStr) {
        const calendarId = TEAM_CALENDARS[team as number];
        if (calendarId && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          try {
            const accessToken = await getAccessToken();
            await deleteGoogleEvent(accessToken, calendarId, event.googleEventId);
          } catch (err) {
            console.error("[baltam/cancel] Google Calendar delete failed:", err);
            // Continue with DB deletion even if Google fails
          }
        }
      }
    }

    // Delete assignees and event
    await prisma.scheduleAssignee.deleteMany({ where: { eventId } });
    await prisma.scheduleEvent.delete({ where: { id: eventId } });

    await prisma.scheduleChange.create({
      data: {
        eventId,
        team,
        date: today,
        changeType: "cancel",
        description: `בוטל: ${event.title}`,
        previousData: JSON.stringify({ title: event.title, startTime: event.startTime, endTime: event.endTime }),
        reason: reason || null,
        affectedUserIds: JSON.stringify(assigneeIds),
        createdById: userId,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "swap") {
    const { eventId1, eventId2, reason } = body;
    if (!eventId1 || !eventId2) return NextResponse.json({ error: "חסרים אירועים" }, { status: 400 });

    const [e1, e2] = await Promise.all([
      prisma.scheduleEvent.findUnique({ where: { id: eventId1 }, include: { assignees: true } }),
      prisma.scheduleEvent.findUnique({ where: { id: eventId2 }, include: { assignees: true } }),
    ]);
    if (!e1 || !e2) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    const e1Assignees = e1.assignees.map(a => a.userId);
    const e2Assignees = e2.assignees.map(a => a.userId);

    await prisma.scheduleAssignee.deleteMany({ where: { eventId: { in: [eventId1, eventId2] } } });

    for (const uid of e2Assignees) {
      await prisma.scheduleAssignee.create({ data: { eventId: eventId1, userId: uid } });
    }
    for (const uid of e1Assignees) {
      await prisma.scheduleAssignee.create({ data: { eventId: eventId2, userId: uid } });
    }

    // Mark both as unsynced
    await prisma.scheduleEvent.updateMany({
      where: { id: { in: [eventId1, eventId2] } },
      data: { calendarSynced: false },
    });

    const allAffected = [...new Set([...e1Assignees, ...e2Assignees])];
    await prisma.scheduleChange.create({
      data: {
        team,
        date: today,
        changeType: "swap",
        description: `החלפה: ${e1.title} ↔ ${e2.title}`,
        previousData: JSON.stringify({ event1: e1Assignees, event2: e2Assignees }),
        newData: JSON.stringify({ event1: e2Assignees, event2: e1Assignees }),
        reason: reason || null,
        affectedUserIds: JSON.stringify(allAffected),
        createdById: userId,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "reassign") {
    const { eventId, oldUserId, newUserId, reason } = body;
    if (!eventId || !oldUserId || !newUserId) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    await prisma.scheduleAssignee.deleteMany({ where: { eventId, userId: oldUserId } });
    await prisma.scheduleAssignee.create({ data: { eventId, userId: newUserId } });

    // Mark as unsynced
    await prisma.scheduleEvent.update({
      where: { id: eventId },
      data: { calendarSynced: false },
    });

    const [oldUser, newUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: oldUserId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: newUserId }, select: { name: true } }),
    ]);

    await prisma.scheduleChange.create({
      data: {
        eventId,
        team,
        date: today,
        changeType: "reassign",
        description: `שיבוץ מחדש: ${event.title} — ${oldUser?.name} → ${newUser?.name}`,
        previousData: JSON.stringify({ userId: oldUserId }),
        newData: JSON.stringify({ userId: newUserId }),
        reason: reason || null,
        affectedUserIds: JSON.stringify([oldUserId, newUserId]),
        createdById: userId,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "split") {
    const { eventId, splitTime, assigneesGroup1, assigneesGroup2, reason } = body;
    if (!eventId || !splitTime || !assigneesGroup1 || !assigneesGroup2) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.findUnique({
      where: { id: eventId },
      include: { assignees: { select: { userId: true } } },
    });
    if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    const splitDate = new Date(splitTime);

    // Update original event: keep start, end at split point, group1 assignees
    await prisma.scheduleAssignee.deleteMany({ where: { eventId } });
    await prisma.scheduleEvent.update({
      where: { id: eventId },
      data: { endTime: splitDate, calendarSynced: false },
    });
    for (const uid of assigneesGroup1 as string[]) {
      await prisma.scheduleAssignee.create({ data: { eventId, userId: uid } });
    }

    // Create second event: start at split point, end at original end, group2 assignees
    const event2 = await prisma.scheduleEvent.create({
      data: {
        title: event.title,
        description: event.description,
        startTime: splitDate,
        endTime: event.endTime,
        target: event.target,
        type: event.type,
        calendarSynced: false,
      },
    });
    for (const uid of assigneesGroup2 as string[]) {
      await prisma.scheduleAssignee.create({ data: { eventId: event2.id, userId: uid } });
    }

    const allAffected = [...new Set([...(assigneesGroup1 as string[]), ...(assigneesGroup2 as string[])])];
    await prisma.scheduleChange.create({
      data: {
        eventId,
        team,
        date: today,
        changeType: "create",
        description: `פוצל: ${event.title}`,
        previousData: JSON.stringify({ startTime: event.startTime, endTime: event.endTime }),
        newData: JSON.stringify({ event1End: splitTime, event2Start: splitTime, event2Id: event2.id }),
        reason: reason || null,
        affectedUserIds: JSON.stringify(allAffected),
        createdById: userId,
      },
    });

    return NextResponse.json({ ok: true, newEventId: event2.id });
  }

  if (action === "duplicate") {
    const { eventId, newStartTime, newEndTime, reason } = body;
    if (!eventId || !newStartTime || !newEndTime) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.findUnique({
      where: { id: eventId },
      include: { assignees: { select: { userId: true } } },
    });
    if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    const newEvent = await prisma.scheduleEvent.create({
      data: {
        title: event.title,
        description: event.description,
        startTime: new Date(newStartTime),
        endTime: new Date(newEndTime),
        target: event.target,
        type: event.type,
        calendarSynced: false,
      },
    });

    // Copy assignees
    for (const a of event.assignees) {
      await prisma.scheduleAssignee.create({ data: { eventId: newEvent.id, userId: a.userId } });
    }

    await prisma.scheduleChange.create({
      data: {
        eventId: newEvent.id,
        team,
        date: today,
        changeType: "create",
        description: `שוכפל: ${event.title}`,
        newData: JSON.stringify({ startTime: newStartTime, endTime: newEndTime }),
        reason: reason || null,
        affectedUserIds: JSON.stringify(event.assignees.map(a => a.userId)),
        createdById: userId,
      },
    });

    return NextResponse.json({ ok: true, newEventId: newEvent.id });
  }

  return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
}
