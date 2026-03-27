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
        include: { user: { select: { id: true, name: true, nameEn: true, team: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Get all users for replacement suggestions
  const allUsers = await prisma.user.findMany({
    where: { role: { not: "admin" } },
    select: { id: true, name: true, nameEn: true, team: true, image: true, roomNumber: true },
    orderBy: { name: "asc" },
  });

  // Check if current user is Roni
  const roni = await isRoni(userId);

  // Get appeals for this table
  const appeals = table ? await prisma.dutyAppeal.findMany({
    where: { tableId: table.id },
    include: {
      user: { select: { id: true, name: true, nameEn: true, image: true } },
      suggestedUser: { select: { id: true, name: true, nameEn: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  }) : [];

  // Compute hours per person for this specific date only (fairness per day)
  const dateTables = await prisma.dutyTable.findMany({
    where: { date },
    select: { id: true },
  });
  const dateTableIds = dateTables.map(t => t.id);
  const dateAssignments = dateTableIds.length > 0
    ? await prisma.dutyAssignment.findMany({
        where: { tableId: { in: dateTableIds } },
        select: { userId: true, timeSlot: true, role: true },
      })
    : [];

  function parseHours(range: string): number {
    const parts = range.split("-");
    if (parts.length !== 2) return 0;
    const sp = parts[0].split(":").map(Number);
    const ep = parts[1].split(":").map(Number);
    if (sp.length < 2 || ep.length < 2 || sp.some(isNaN) || ep.some(isNaN)) return 0;
    let h = (ep[0] * 60 + ep[1] - sp[0] * 60 - sp[1]) / 60;
    if (h < 0) h += 24;
    return h;
  }

  // Roles to exclude from hours: day roles + reserve (עתודה)
  const DAY_ROLES = ['כ"כא', 'כ"כב'];
  const RESERVE_ROLES = ["עתודה"];

  const hoursMap: Record<string, number> = {};
  for (const a of dateAssignments) {
    if (DAY_ROLES.includes(a.role)) continue;
    if (RESERVE_ROLES.includes(a.role)) continue;
    // Guard: timeSlot is time range. OBS: role is the time range, timeSlot is row number.
    const hours = parseHours(a.timeSlot) || parseHours(a.role);
    if (hours > 0) {
      hoursMap[a.userId] = (hoursMap[a.userId] || 0) + hours;
    }
  }

  // Get all dates that have tables (for navigation)
  const availableDates = await prisma.dutyTable.findMany({
    select: { date: true, type: true },
    orderBy: { date: "desc" },
    distinct: ["date"],
  });

  const isCreator = table?.createdById === userId;

  // Day type config (kitchen vs duty)
  const dayTypeConfig = await prisma.dayTypeConfig.findUnique({ where: { date } });
  const dayType = dayTypeConfig?.type || "duty";

  return NextResponse.json({ table, allUsers, isRoni: roni, isCreator, appeals, hoursMap, dayType, availableDates: availableDates.map(d => d.date) });
}

// POST — create or update entire duty table (Roni only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { date, type, title, roles, timeSlots, assignments, metadata } = await req.json();
  // assignments: { userId: string, timeSlot: string, role: string }[]

  if (!date || !type || !title || !roles || !timeSlots || !assignments) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  const metaStr = metadata ? JSON.stringify(metadata) : null;

  // Upsert table
  const table = await prisma.dutyTable.upsert({
    where: { date_type: { date, type } },
    update: { title, roles: JSON.stringify(roles), timeSlots: JSON.stringify(timeSlots), metadata: metaStr, updatedAt: new Date() },
    create: { date, type, title, roles: JSON.stringify(roles), timeSlots: JSON.stringify(timeSlots), metadata: metaStr, createdById: userId },
  });

  // Delete old assignments and recreate
  await prisma.dutyAssignment.deleteMany({ where: { tableId: table.id } });

  if (assignments.length > 0) {
    await prisma.dutyAssignment.createMany({
      data: assignments.map((a: { userId: string; timeSlot: string; role: string; note?: string }) => ({
        tableId: table.id,
        userId: a.userId,
        timeSlot: a.timeSlot,
        role: a.role,
        note: a.note || null,
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
        user: { select: { id: true, name: true, nameEn: true } },
        suggestedUser: { select: { id: true, name: true, nameEn: true } },
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
      include: { user: { select: { id: true, name: true, nameEn: true } } },
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

  // ── NOTIFY ALL: send each assigned user their personal assignments ──
  if (action === "notify-all") {
    if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const { tableId } = body;
    const table = await prisma.dutyTable.findUnique({
      where: { id: tableId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, nameEn: true } } },
        },
      },
    });
    if (!table) return NextResponse.json({ error: "טבלה לא נמצאה" }, { status: 404 });

    // Group assignments by user
    const byUser = new Map<string, { name: string; roles: string[] }>();
    const DAY_ROLES = ['כ"כא', 'כ"כב'];
    for (const a of table.assignments) {
      if (!byUser.has(a.userId)) byUser.set(a.userId, { name: a.user.name, roles: [] });
      const entry = byUser.get(a.userId)!;
      if (DAY_ROLES.includes(a.role)) {
        entry.roles.push(a.role);
      } else {
        entry.roles.push(`${a.role} (${a.note || a.timeSlot})`);
      }
    }

    // Send personalized notification to each user
    const promises = [];
    for (const [uid, data] of byUser) {
      const rolesList = data.roles.join(", ");
      promises.push(
        sendPushToUsers([uid], {
          title: `שיבוץ: ${table.title} — ${table.date}`,
          body: `${data.name}, השיבוצים שלך: ${rolesList}`,
          url: "/guard-duty",
        }).catch(() => {})
      );
    }
    await Promise.allSettled(promises);

    return NextResponse.json({ success: true, notified: byUser.size });
  }

  // ── REMOVE: remove a person from a specific assignment (Roni only) ──
  if (action === "remove") {
    if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const { assignmentId } = body;
    const assignment = await prisma.dutyAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!assignment) return NextResponse.json({ error: "שיבוץ לא נמצא" }, { status: 404 });

    await prisma.dutyAssignment.delete({ where: { id: assignmentId } });

    // Notify the removed user
    sendPushToUsers([assignment.userId], {
      title: "הוסרת משיבוץ",
      body: `הוסרת מ${assignment.role} (${assignment.timeSlot})`,
      url: "/guard-duty",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
}

// DELETE — delete entire table (creator or admin only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const table = await prisma.dutyTable.findUnique({ where: { id }, select: { createdById: true } });
  if (!table) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isCreator = table.createdById === userId;
  const isAdmin = user?.role === "admin";
  if (!isCreator && !isAdmin) return NextResponse.json({ error: "רק היוצר יכול לבטל" }, { status: 403 });

  await prisma.dutyAppeal.deleteMany({ where: { tableId: id } });
  await prisma.dutyTable.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
