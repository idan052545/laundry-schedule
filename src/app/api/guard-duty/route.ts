import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

const RONI_NAME = "רוני קרפט";

async function isRoni(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.name === RONI_NAME || user?.email === "ohad@dotan.com" || user?.role === "admin";
}

// GET — fetch duty table for date + type
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type") || "guard";

  if (!date) return NextResponse.json({ error: "חסר תאריך" }, { status: 400 });

  const table = await prisma.dutyTable.findUnique({
    where: { date_type: { date, type } },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, team: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Get all users for replacement suggestions
  const allUsers = await prisma.user.findMany({
    where: { role: { not: "admin" } },
    select: { id: true, name: true, team: true, image: true },
    orderBy: { name: "asc" },
  });

  // Check if current user is Roni
  const roni = await isRoni(userId);

  // Get appeals for this table
  const appeals = table ? await prisma.dutyAppeal.findMany({
    where: { tableId: table.id },
    include: {
      user: { select: { id: true, name: true, image: true } },
      suggestedUser: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  }) : [];

  // Compute hours per person across all tables (fairness)
  const allAssignments = await prisma.dutyAssignment.findMany({
    select: { userId: true, timeSlot: true },
  });

  const hoursMap: Record<string, number> = {};
  for (const a of allAssignments) {
    const parts = a.timeSlot.split("-");
    if (parts.length === 2) {
      const [sh, sm] = parts[0].split(":").map(Number);
      const [eh, em] = parts[1].split(":").map(Number);
      let hours = (eh * 60 + em - sh * 60 - sm) / 60;
      if (hours < 0) hours += 24; // overnight
      hoursMap[a.userId] = (hoursMap[a.userId] || 0) + hours;
    }
  }

  // Get all dates that have tables (for navigation)
  const availableDates = await prisma.dutyTable.findMany({
    select: { date: true, type: true },
    orderBy: { date: "desc" },
    distinct: ["date"],
  });

  return NextResponse.json({ table, allUsers, isRoni: roni, appeals, hoursMap, availableDates: availableDates.map(d => d.date) });
}

// POST — create or update entire duty table (Roni only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { date, type, title, roles, timeSlots, assignments } = await req.json();
  // assignments: { userId: string, timeSlot: string, role: string }[]

  if (!date || !type || !title || !roles || !timeSlots || !assignments) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  // Upsert table
  const table = await prisma.dutyTable.upsert({
    where: { date_type: { date, type } },
    update: { title, roles: JSON.stringify(roles), timeSlots: JSON.stringify(timeSlots), updatedAt: new Date() },
    create: { date, type, title, roles: JSON.stringify(roles), timeSlots: JSON.stringify(timeSlots) },
  });

  // Delete old assignments and recreate
  await prisma.dutyAssignment.deleteMany({ where: { tableId: table.id } });

  if (assignments.length > 0) {
    await prisma.dutyAssignment.createMany({
      data: assignments.map((a: { userId: string; timeSlot: string; role: string }) => ({
        tableId: table.id,
        userId: a.userId,
        timeSlot: a.timeSlot,
        role: a.role,
      })),
    });
  }

  // Notify all assigned users
  const assignedUserIds = [...new Set(assignments.map((a: { userId: string }) => a.userId))];
  if (assignedUserIds.length > 0) {
    sendPushToUsers(assignedUserIds as string[], {
      title: `שיבוץ חדש: ${title}`,
      body: `שובצת ל${title} בתאריך ${date}. בדוק את השיבוץ שלך.`,
      url: "/guard-duty",
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, tableId: table.id });
}

// PUT — swap/replace person OR appeal
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { action } = body;

  // ── SWAP (Roni only): replace one person with another in a specific slot ──
  if (action === "swap") {
    if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const { assignmentId, newUserId } = body;
    const assignment = await prisma.dutyAssignment.findUnique({
      where: { id: assignmentId },
      include: { table: true, user: { select: { name: true } } },
    });
    if (!assignment) return NextResponse.json({ error: "שיבוץ לא נמצא" }, { status: 404 });

    // Check for overlap — new user already assigned in same time slot on same table
    const overlap = await prisma.dutyAssignment.findFirst({
      where: {
        tableId: assignment.tableId,
        userId: newUserId,
        timeSlot: assignment.timeSlot,
        id: { not: assignmentId },
      },
    });
    if (overlap) {
      return NextResponse.json({ error: "חייל זה כבר משובץ באותה משמרת" }, { status: 400 });
    }

    const oldUserId = assignment.userId;
    const oldUserName = assignment.user.name;

    await prisma.dutyAssignment.update({
      where: { id: assignmentId },
      data: { userId: newUserId },
    });

    const newUser = await prisma.user.findUnique({ where: { id: newUserId }, select: { name: true } });

    // Notify both old and new user
    sendPushToUsers([oldUserId, newUserId], {
      title: "שינוי שיבוץ",
      body: `${oldUserName} הוחלף ב-${newUser?.name || "חייל"} ב${assignment.role} (${assignment.timeSlot})`,
      url: "/guard-duty",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  }

  // ── APPEAL: user says they can't make it, optionally suggests replacement ──
  if (action === "appeal") {
    const { assignmentId, reason, suggestedUserId } = body;
    const assignment = await prisma.dutyAssignment.findUnique({
      where: { id: assignmentId },
      include: { table: true },
    });
    if (!assignment) return NextResponse.json({ error: "שיבוץ לא נמצא" }, { status: 404 });

    const appeal = await prisma.dutyAppeal.create({
      data: {
        tableId: assignment.tableId,
        assignmentId,
        userId,
        reason: reason || "",
        suggestedUserId: suggestedUserId || null,
        status: "pending",
      },
      include: {
        user: { select: { id: true, name: true } },
        suggestedUser: { select: { id: true, name: true } },
      },
    });

    // Notify Roni about the appeal
    const roniUser = await prisma.user.findFirst({ where: { name: RONI_NAME }, select: { id: true } });
    if (roniUser) {
      sendPushToUsers([roniUser.id], {
        title: "ערעור על שיבוץ",
        body: `${appeal.user.name} מבקש להחליף ב${assignment.role} (${assignment.timeSlot})${appeal.suggestedUser ? ` — מציע: ${appeal.suggestedUser.name}` : ""}`,
        url: "/guard-duty",
      }).catch(() => {});
    }

    return NextResponse.json(appeal);
  }

  // ── RESOLVE APPEAL (Roni only) ──
  if (action === "resolve-appeal") {
    if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const { appealId, approved } = body;
    const appeal = await prisma.dutyAppeal.findUnique({
      where: { id: appealId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!appeal) return NextResponse.json({ error: "ערעור לא נמצא" }, { status: 404 });

    if (approved && appeal.suggestedUserId) {
      // Apply the swap
      const assignment = await prisma.dutyAssignment.findUnique({ where: { id: appeal.assignmentId } });
      if (assignment) {
        // Check overlap
        const overlap = await prisma.dutyAssignment.findFirst({
          where: {
            tableId: assignment.tableId,
            userId: appeal.suggestedUserId,
            timeSlot: assignment.timeSlot,
            id: { not: assignment.id },
          },
        });
        if (overlap) {
          return NextResponse.json({ error: "המחליף כבר משובץ באותה משמרת" }, { status: 400 });
        }

        await prisma.dutyAssignment.update({
          where: { id: assignment.id },
          data: { userId: appeal.suggestedUserId },
        });
      }
    }

    await prisma.dutyAppeal.update({
      where: { id: appealId },
      data: { status: approved ? "approved" : "rejected" },
    });

    // Notify the appealer
    sendPushToUsers([appeal.userId], {
      title: approved ? "ערעור אושר" : "ערעור נדחה",
      body: approved ? "הערעור שלך אושר וההחלפה בוצעה" : "הערעור שלך נדחה",
      url: "/guard-duty",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
}

// DELETE — delete entire table (Roni only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  await prisma.dutyAppeal.deleteMany({ where: { tableId: id } });
  await prisma.dutyTable.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
