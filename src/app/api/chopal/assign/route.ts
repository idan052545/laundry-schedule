import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

// Helper: check if user is נעמה (קארית) or admin
async function isChopalAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, roleTitle: true },
  });
  return (
    user?.name === "נעמה לוי" ||
    user?.roleTitle?.includes("קא\"רית") ||
    user?.roleTitle?.includes("קארית") ||
    user?.email === "ohad@dotan.com" ||
    user?.role === "admin"
  );
}

// POST — Admin assigns time to a chopal request
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isChopalAdmin(userId))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { chopalRequestId, assignedTime } = await request.json();
  if (!chopalRequestId || !assignedTime) {
    return NextResponse.json({ error: "חסר מזהה בקשה או שעה" }, { status: 400 });
  }

  // Validate time format HH:MM
  if (!/^\d{2}:\d{2}$/.test(assignedTime)) {
    return NextResponse.json({ error: "פורמט שעה לא תקין (HH:MM)" }, { status: 400 });
  }

  const chopalRequest = await prisma.chopalRequest.findUnique({
    where: { id: chopalRequestId },
    include: { user: { select: { id: true, name: true } }, assignment: true },
  });

  if (!chopalRequest) {
    return NextResponse.json({ error: "בקשה לא נמצאה" }, { status: 404 });
  }

  // Create schedule event for the user's personal לו"ז
  const eventDate = chopalRequest.date;
  const startTime = new Date(`${eventDate}T${assignedTime}:00+03:00`);
  // Default 30 min duration
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  // Use transaction: create/update assignment + schedule event
  const result = await prisma.$transaction(async (tx) => {
    // Create the schedule event
    const scheduleEvent = await tx.scheduleEvent.create({
      data: {
        title: `חופ"ל — ${chopalRequest.user.name}`,
        description: chopalRequest.note || undefined,
        startTime,
        endTime,
        allDay: false,
        target: "all",
        type: "personal",
      },
    });

    // Assign user to the schedule event
    await tx.scheduleAssignee.create({
      data: { eventId: scheduleEvent.id, userId: chopalRequest.userId },
    });

    // Upsert the chopal assignment
    const assignment = await tx.chopalAssignment.upsert({
      where: { chopalRequestId },
      update: {
        assignedTime,
        status: "pending",
        rejectReason: null,
        scheduleEventId: scheduleEvent.id,
      },
      create: {
        chopalRequestId,
        userId: chopalRequest.userId,
        date: eventDate,
        assignedTime,
        scheduleEventId: scheduleEvent.id,
      },
    });

    // If there was an old schedule event from previous assignment, delete it
    if (chopalRequest.assignment?.scheduleEventId && chopalRequest.assignment.scheduleEventId !== scheduleEvent.id) {
      await tx.scheduleAssignee.deleteMany({ where: { eventId: chopalRequest.assignment.scheduleEventId } });
      await tx.scheduleEvent.delete({ where: { id: chopalRequest.assignment.scheduleEventId } }).catch(() => {});
    }

    return assignment;
  });

  // Send push to the user
  await sendPushToUsers([chopalRequest.userId], {
    title: "תור חופ\"ל נקבע!",
    body: `התור שלך נקבע לשעה ${assignedTime}`,
    url: "/chopal",
    tag: `chopal-assign-${chopalRequest.date}`,
  });

  return NextResponse.json({ success: true, assignment: result });
}

// PUT — User accepts/rejects assignment
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { assignmentId, action, reason } = await request.json();

  if (!assignmentId || !action) {
    return NextResponse.json({ error: "חסר פרטים" }, { status: 400 });
  }

  const assignment = await prisma.chopalAssignment.findUnique({
    where: { id: assignmentId },
    include: { user: { select: { name: true } } },
  });

  if (!assignment) return NextResponse.json({ error: "שיבוץ לא נמצא" }, { status: 404 });
  if (assignment.userId !== userId) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  if (action === "accept") {
    await prisma.chopalAssignment.update({
      where: { id: assignmentId },
      data: { status: "accepted" },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { roleTitle: { contains: "קא\"רית" } },
          { roleTitle: { contains: "קארית" } },
          { name: "נעמה לוי" },
        ],
      },
      select: { id: true },
    });
    if (admins.length > 0) {
      await sendPushToUsers(admins.map(a => a.id), {
        title: "חופ\"ל אושר",
        body: `${assignment.user.name} אישר/ה את התור ב-${assignment.assignedTime}`,
        url: "/chopal/admin",
        tag: `chopal-accept-${assignment.date}-${userId}`,
      });
    }

    return NextResponse.json({ success: true, status: "accepted" });
  }

  if (action === "reject") {
    await prisma.chopalAssignment.update({
      where: { id: assignmentId },
      data: { status: "rejected", rejectReason: reason || null },
    });

    // Delete the schedule event
    if (assignment.scheduleEventId) {
      await prisma.scheduleAssignee.deleteMany({ where: { eventId: assignment.scheduleEventId } });
      await prisma.scheduleEvent.delete({ where: { id: assignment.scheduleEventId } }).catch(() => {});
    }

    // Notify admins
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { roleTitle: { contains: "קא\"רית" } },
          { roleTitle: { contains: "קארית" } },
          { name: "נעמה לוי" },
        ],
      },
      select: { id: true },
    });
    if (admins.length > 0) {
      await sendPushToUsers(admins.map(a => a.id), {
        title: "חופ\"ל נדחה",
        body: `${assignment.user.name} דחה/תה את התור ב-${assignment.assignedTime}${reason ? ` — ${reason}` : ""}`,
        url: "/chopal/admin",
        tag: `chopal-reject-${assignment.date}-${userId}`,
      });
    }

    return NextResponse.json({ success: true, status: "rejected" });
  }

  return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
}

// DELETE — Admin removes assignment
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const adminId = (session.user as { id: string }).id;
  if (!(await isChopalAdmin(adminId))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("id");
  if (!assignmentId) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const assignment = await prisma.chopalAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  // Delete schedule event if exists
  if (assignment.scheduleEventId) {
    await prisma.scheduleAssignee.deleteMany({ where: { eventId: assignment.scheduleEventId } });
    await prisma.scheduleEvent.delete({ where: { id: assignment.scheduleEventId } }).catch(() => {});
  }

  await prisma.chopalAssignment.delete({ where: { id: assignmentId } });

  return NextResponse.json({ success: true });
}
