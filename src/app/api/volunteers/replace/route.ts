import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

// POST — request replacement
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { assignmentId, reason, isUrgent } = await request.json();

  if (!assignmentId) return NextResponse.json({ error: "חסר מזהה שיבוץ" }, { status: 400 });

  const assignment = await prisma.volunteerAssignment.findUnique({
    where: { id: assignmentId },
    include: { request: { include: { createdBy: { select: { name: true } } } }, user: { select: { name: true, team: true } } },
  });

  if (!assignment) return NextResponse.json({ error: "שיבוץ לא נמצא" }, { status: 404 });
  if (assignment.userId !== userId) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const replacement = await prisma.volunteerReplacement.create({
    data: {
      requestId: assignment.requestId,
      originalAssignmentId: assignmentId,
      originalUserId: userId,
      reason: reason || null,
      isUrgent: isUrgent || false,
    },
  });

  // Find free candidates for notification
  const req = assignment.request;
  let teamFilter: Record<string, unknown> = {};
  if (req.target.startsWith("team-")) {
    teamFilter = { team: parseInt(req.target.replace("team-", "")) };
  }

  const candidates = await prisma.user.findMany({
    where: { ...teamFilter, id: { not: userId }, role: { not: "simulator" } },
    select: { id: true },
  });

  const title = isUrgent ? "דחוף! צריך מחליף עכשיו" : "מחפשים מחליף לתורנות";
  const body = `${assignment.user.name} צריך/ה מחליף/ה ל${req.title}`;

  if (candidates.length > 0) {
    await sendPushToUsers(candidates.map(c => c.id), {
      title,
      body,
      url: "/volunteers",
      tag: `volunteer-replace-${replacement.id}`,
    });
  }

  // Also notify creator
  if (req.createdById !== userId) {
    await sendPushToUsers([req.createdById], {
      title: "בקשת החלפה",
      body: `${assignment.user.name} מבקש/ת החלפה ב${req.title}`,
      url: "/volunteers",
      tag: `volunteer-replace-creator-${replacement.id}`,
    });
  }

  return NextResponse.json(replacement);
}

// PUT — accept replacement (someone volunteers to replace)
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { replacementId } = await request.json();

  if (!replacementId) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const replacement = await prisma.volunteerReplacement.findUnique({
    where: { id: replacementId },
    include: { request: true, originalUser: { select: { name: true } } },
  });

  if (!replacement) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (replacement.status !== "seeking") return NextResponse.json({ error: "כבר נמצא מחליף" }, { status: 400 });

  const replacerName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name;

  // Transaction: update replacement, mark old assignment replaced, create new assignment
  await prisma.$transaction([
    prisma.volunteerReplacement.update({
      where: { id: replacementId },
      data: { replacementUserId: userId, status: "found" },
    }),
    prisma.volunteerAssignment.update({
      where: { id: replacement.originalAssignmentId },
      data: { status: "replaced" },
    }),
    prisma.volunteerAssignment.create({
      data: {
        requestId: replacement.requestId,
        userId,
        assignedById: userId,
        assignmentType: "self",
      },
    }),
  ]);

  // Notify the original user
  await sendPushToUsers([replacement.originalUserId], {
    title: "נמצא מחליף!",
    body: `${replacerName} יחליף אותך ב${replacement.request.title}`,
    url: "/volunteers",
    tag: `volunteer-replaced-${replacementId}`,
  });

  return NextResponse.json({ success: true });
}
