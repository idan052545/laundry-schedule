import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

// POST — assign user to volunteer request
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const currentUserId = (session.user as { id: string }).id;
  const body = await request.json();
  const { requestId, userId, assignmentType } = body;

  if (!requestId) return NextResponse.json({ error: "חסר מזהה בקשה" }, { status: 400 });

  const targetUserId = userId || currentUserId;
  const type = assignmentType || (targetUserId === currentUserId ? "self" : "team-member");

  const req = await prisma.volunteerRequest.findUnique({
    where: { id: requestId },
    include: { assignments: { where: { status: { not: "cancelled" } } } },
  });

  if (!req) return NextResponse.json({ error: "בקשה לא נמצאה" }, { status: 404 });
  if (req.status !== "open") return NextResponse.json({ error: "הבקשה כבר סגורה" }, { status: 400 });

  // Check if already assigned
  const existing = await prisma.volunteerAssignment.findUnique({
    where: { requestId_userId: { requestId, userId: targetUserId } },
  });
  if (existing && existing.status !== "cancelled") {
    return NextResponse.json({ error: "כבר משובץ לתורנות זו" }, { status: 400 });
  }

  // Commander assignment permission check
  if (type === "commander") {
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } });
    if (currentUser?.role !== "admin" && currentUser?.role !== "commander") {
      return NextResponse.json({ error: "אין הרשאה לשבץ כמפקד" }, { status: 403 });
    }
  }

  // Team-member assignment permission check
  if (type === "team-member" && targetUserId !== currentUserId) {
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUserId }, select: { team: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { team: true } }),
    ]);
    if (!currentUser?.team || currentUser.team !== targetUser?.team) {
      return NextResponse.json({ error: "ניתן לשבץ רק חברי צוות שלך" }, { status: 403 });
    }
  }

  const assignment = existing
    ? await prisma.volunteerAssignment.update({
        where: { id: existing.id },
        data: { status: "assigned", assignedById: type !== "self" ? currentUserId : null, assignmentType: type },
      })
    : await prisma.volunteerAssignment.create({
        data: {
          requestId,
          userId: targetUserId,
          assignedById: type !== "self" ? currentUserId : null,
          assignmentType: type,
        },
      });

  // Check if request is now filled
  const activeCount = req.assignments.filter(a => a.status !== "cancelled").length + 1;
  if (activeCount >= req.requiredCount) {
    await prisma.volunteerRequest.update({ where: { id: requestId }, data: { status: "filled" } });
  }

  // Notify request creator if self-assignment
  if (type === "self" && req.createdById !== currentUserId) {
    const userName = (await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } }))?.name;
    await sendPushToUsers([req.createdById], {
      title: "מתנדב חדש!",
      body: `${userName} הצטרף/ה ל${req.title}`,
      url: "/volunteers",
      tag: `volunteer-assign-${requestId}`,
    });
  }

  // Notify target user if assigned by someone else
  if (targetUserId !== currentUserId) {
    const assignerName = (await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } }))?.name;
    const startStr = req.startTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
    await sendPushToUsers([targetUserId], {
      title: "שובצת לתורנות",
      body: `${assignerName} שיבץ אותך ל${req.title} (${startStr})`,
      url: "/volunteers",
      tag: `volunteer-assigned-${requestId}`,
    });
  }

  return NextResponse.json(assignment);
}

// DELETE — remove assignment
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const currentUserId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("id");
  if (!assignmentId) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const assignment = await prisma.volunteerAssignment.findUnique({
    where: { id: assignmentId },
    include: { request: true },
  });
  if (!assignment) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  // Can cancel own assignment, or creator/admin can cancel anyone's
  const user = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } });
  const isOwner = assignment.userId === currentUserId;
  const isCreator = assignment.request.createdById === currentUserId;
  const isAdmin = user?.role === "admin" || user?.role === "commander";
  if (!isOwner && !isCreator && !isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.volunteerAssignment.update({ where: { id: assignmentId }, data: { status: "cancelled" } });

  // Reopen request if it was filled
  if (assignment.request.status === "filled") {
    await prisma.volunteerRequest.update({ where: { id: assignment.requestId }, data: { status: "open" } });
  }

  return NextResponse.json({ success: true });
}
