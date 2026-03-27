import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const RONI_NAME = "רוני קרפט";
const DAY_ROLES = ['כ"כא', 'כ"כב'];

async function isRoni(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.name === RONI_NAME || user?.email === "ohad@dotan.com" || user?.role === "admin";
}

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

function toMin(t: string) {
  const p = t.split(":").map(Number);
  return p.length === 2 && !p.some(isNaN) ? p[0] * 60 + p[1] : -1;
}

function getTimeRange(slot: string): [number, number] | null {
  const parts = slot.split("-");
  if (parts.length !== 2) return null;
  const s = toMin(parts[0]), e = toMin(parts[1]);
  if (s < 0 || e < 0) return null;
  return [s, e < s ? e + 1440 : e];
}

function rangesOverlap(a: [number, number], b: [number, number]) {
  return a[0] < b[1] && b[0] < a[1];
}

// POST — suggest best replacement candidates for a given assignment
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { assignmentId } = await req.json();
  if (!assignmentId) return NextResponse.json({ error: "חסר מזהה שיבוץ" }, { status: 400 });

  const assignment = await prisma.dutyAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      table: { include: { assignments: { include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true, roomNumber: true } } } } } },
    },
  });
  if (!assignment) return NextResponse.json({ error: "שיבוץ לא נמצא" }, { status: 404 });

  const date = assignment.table.date;

  // Get all users not already busy in that time slot
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: ["sagal", "simulator", "simulator-admin"] } },
    select: { id: true, name: true, nameEn: true, team: true, image: true, roomNumber: true, role: true, roleTitle: true },
    orderBy: { name: "asc" },
  });

  // Filter out simulators by roleTitle
  const eligible = allUsers.filter(u => {
    if (u.roleTitle?.includes("סימולטור") || u.roleTitle?.includes("simulator")) return false;
    if (u.role === "admin" && !u.name.includes("עידן חן סימנטוב")) return false;
    return true;
  });

  // Get all assignments for this date across all tables
  const dateTables = await prisma.dutyTable.findMany({
    where: { date },
    include: { assignments: true },
  });

  // Build busy map: userId -> time ranges they're occupied
  const busyMap: Record<string, [number, number][]> = {};
  for (const t of dateTables) {
    for (const a of t.assignments) {
      if (a.id === assignmentId) continue; // exclude the assignment being replaced
      if (DAY_ROLES.includes(a.role)) continue;
      const range = getTimeRange(a.note || a.timeSlot) || getTimeRange(a.role);
      if (range) {
        if (!busyMap[a.userId]) busyMap[a.userId] = [];
        busyMap[a.userId].push(range);
      }
    }
  }

  // Target time range for the slot we need to fill
  const targetRange = getTimeRange(assignment.note || assignment.timeSlot) || getTimeRange(assignment.role);

  // Historical hours for fairness
  const allAssignments = await prisma.dutyAssignment.findMany({
    select: { userId: true, timeSlot: true, role: true },
  });
  const hoursMap: Record<string, number> = {};
  for (const a of allAssignments) {
    if (DAY_ROLES.includes(a.role)) continue;
    const h = parseHours(a.timeSlot) || parseHours(a.role);
    if (h > 0) hoursMap[a.userId] = (hoursMap[a.userId] || 0) + h;
  }

  // Fairness debt
  const fairnessRecords = await prisma.dutyFairness.findMany({
    select: { userId: true, debt: true },
  });
  const debtMap: Record<string, number> = {};
  for (const f of fairnessRecords) {
    debtMap[f.userId] = (debtMap[f.userId] || 0) + f.debt;
  }

  // Already assigned in this table
  const alreadyAssigned = new Set(assignment.table.assignments.map(a => a.userId));

  // Score and rank candidates
  const candidates = eligible
    .filter(u => u.id !== assignment.userId) // not the current person
    .map(u => {
      // Check time overlap
      const isBusy = targetRange && busyMap[u.id]?.some(r => rangesOverlap(targetRange, r));
      const isAssignedToday = alreadyAssigned.has(u.id);
      const hours = hoursMap[u.id] || 0;
      const debt = debtMap[u.id] || 0;

      // Lower score = better candidate
      let score = hours + debt * 2;
      if (isBusy) score += 10000; // heavily penalize busy people
      if (isAssignedToday) score += 50; // slightly penalize already-assigned

      return {
        id: u.id,
        name: u.name,
        nameEn: (u as { nameEn?: string | null }).nameEn,
        team: u.team,
        image: u.image,
        roomNumber: u.roomNumber,
        hours,
        debt,
        isBusy: !!isBusy,
        isAssignedToday,
        score,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 10); // top 10 suggestions

  return NextResponse.json({
    candidates,
    assignment: {
      role: assignment.role,
      timeSlot: assignment.timeSlot,
      note: assignment.note,
      currentUser: assignment.table.assignments.find(a => a.id === assignmentId)?.user,
    },
  });
}
