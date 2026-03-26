import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

async function verifyMamash(userId: string, team: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  if (isAdmin) return true;
  const role = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  return !!role;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { action, team } = body;

  if (!action || !team) return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });

  const hasAccess = await verifyMamash(userId, team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const today = new Date().toISOString().split("T")[0];

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

    // Cascade detection: check if assignees have conflicting events at new time
    const conflicts = await prisma.scheduleEvent.findMany({
      where: {
        id: { not: eventId },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
        assignees: { some: { userId: { in: assigneeIds } } },
      },
      include: {
        assignees: {
          where: { userId: { in: assigneeIds } },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (conflicts.length > 0 && !body.force) {
      return NextResponse.json({
        cascadeConflicts: conflicts.map(c => ({
          eventId: c.id,
          eventTitle: c.title,
          startTime: c.startTime,
          endTime: c.endTime,
          affectedUsers: c.assignees.map(a => a.user),
        })),
      }, { status: 409 });
    }

    // Apply reschedule
    const previousData = JSON.stringify({
      startTime: event.startTime,
      endTime: event.endTime,
    });

    await prisma.scheduleEvent.update({
      where: { id: eventId },
      data: { startTime: newStart, endTime: newEnd },
    });

    // Log change
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

    // Notify affected users
    if (assigneeIds.length > 0) {
      const startStr = newStart.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      const endStr = newEnd.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      await sendPushToUsers(assigneeIds, {
        title: `שינוי לו״ז: ${event.title}`,
        body: `הועבר ל-${startStr}–${endStr}${reason ? ` (${reason})` : ""}`,
        url: "/schedule-daily",
        tag: "baltam",
      }).catch(() => {});
    }

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

    // Delete assignees and event
    await prisma.scheduleAssignee.deleteMany({ where: { eventId } });
    await prisma.scheduleEvent.delete({ where: { id: eventId } });

    // Log change
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

    // Notify
    if (assigneeIds.length > 0) {
      await sendPushToUsers(assigneeIds, {
        title: `בוטל: ${event.title}`,
        body: reason || "האירוע בוטל",
        url: "/schedule-daily",
        tag: "baltam",
      }).catch(() => {});
    }

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

    // Swap assignees
    const e1Assignees = e1.assignees.map(a => a.userId);
    const e2Assignees = e2.assignees.map(a => a.userId);

    await prisma.scheduleAssignee.deleteMany({ where: { eventId: { in: [eventId1, eventId2] } } });

    // Create swapped
    for (const uid of e2Assignees) {
      await prisma.scheduleAssignee.create({ data: { eventId: eventId1, userId: uid } });
    }
    for (const uid of e1Assignees) {
      await prisma.scheduleAssignee.create({ data: { eventId: eventId2, userId: uid } });
    }

    // Log
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

    // Notify
    if (allAffected.length > 0) {
      await sendPushToUsers(allAffected, {
        title: "החלפה בלו״ז",
        body: `${e1.title} ↔ ${e2.title}`,
        url: "/schedule-daily",
        tag: "baltam",
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "reassign") {
    const { eventId, oldUserId, newUserId, reason } = body;
    if (!eventId || !oldUserId || !newUserId) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const event = await prisma.scheduleEvent.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });

    // Remove old assignee, add new
    await prisma.scheduleAssignee.deleteMany({ where: { eventId, userId: oldUserId } });
    await prisma.scheduleAssignee.create({ data: { eventId, userId: newUserId } });

    // Get names for description
    const [oldUser, newUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: oldUserId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: newUserId }, select: { name: true } }),
    ]);

    // Log
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

    // Notify both
    await sendPushToUsers([oldUserId, newUserId], {
      title: `שינוי שיבוץ: ${event.title}`,
      body: `${oldUser?.name} → ${newUser?.name}${reason ? ` (${reason})` : ""}`,
      url: "/schedule-daily",
      tag: "baltam",
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
}
