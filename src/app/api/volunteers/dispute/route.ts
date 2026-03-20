import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

// POST — submit dispute
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { requestId, claimedStartTime, claimedEndTime, reason } = await request.json();

  if (!requestId || !claimedStartTime || !claimedEndTime) {
    return NextResponse.json({ error: "חסר פרטים" }, { status: 400 });
  }

  const req = await prisma.volunteerRequest.findUnique({ where: { id: requestId } });
  if (!req) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const dispute = await prisma.volunteerDispute.create({
    data: {
      requestId,
      userId,
      claimedStartTime: new Date(claimedStartTime),
      claimedEndTime: new Date(claimedEndTime),
      reason: reason || null,
    },
  });

  // Notify creator
  const userName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name;
  await sendPushToUsers([req.createdById], {
    title: "ערעור על שעות",
    body: `${userName} מערער/ת על שעות ב${req.title}`,
    url: "/volunteers",
    tag: `volunteer-dispute-${dispute.id}`,
  });

  return NextResponse.json(dispute);
}

// PUT — review dispute
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { disputeId, status, reviewNote } = await request.json();

  if (!disputeId || !status) return NextResponse.json({ error: "חסר פרטים" }, { status: 400 });

  const dispute = await prisma.volunteerDispute.findUnique({
    where: { id: disputeId },
    include: { request: true },
  });

  if (!dispute) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  // Only creator or admin can review
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (dispute.request.createdById !== userId && user?.role !== "admin" && user?.role !== "commander") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.volunteerDispute.update({
    where: { id: disputeId },
    data: { status, reviewedById: userId, reviewNote: reviewNote || null },
  });

  // If approved, update the assignment actual times
  if (status === "approved") {
    await prisma.volunteerAssignment.updateMany({
      where: { requestId: dispute.requestId, userId: dispute.userId },
      data: { actualStartTime: dispute.claimedStartTime, actualEndTime: dispute.claimedEndTime },
    });
  }

  // Notify disputer
  await sendPushToUsers([dispute.userId], {
    title: status === "approved" ? "ערעור אושר" : "ערעור נדחה",
    body: `הערעור שלך על ${dispute.request.title} ${status === "approved" ? "אושר" : "נדחה"}`,
    url: "/volunteers",
    tag: `volunteer-dispute-resolved-${disputeId}`,
  });

  return NextResponse.json({ success: true });
}
