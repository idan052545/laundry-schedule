import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DAY_ROLES, RESERVE_ROLES } from "./constants";
import { getPersonalRule, parseTimeSlot } from "./helpers";
import { buildGuardTable } from "./buildGuardTable";
import { buildObsTable } from "./buildObsTable";
import { buildKitchenTable } from "./buildKitchenTable";
import type { EligibleUser } from "./types";

const RONI_NAME = "רוני קרפט";

async function isRoni(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.name === RONI_NAME || user?.email === "ohad@dotan.com" || user?.role === "admin";
}

// ─── POST — auto-fill guard + obs tables for a date ───

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { date, types } = await req.json();
  if (!date || !types || !Array.isArray(types)) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  // Get all eligible users (exclude sagal, admin, simulator roles)
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: ["admin", "sagal", "simulator", "simulator-admin"] } },
    select: { id: true, name: true, nameEn: true, team: true, image: true, role: true, roleTitle: true, roomNumber: true },
    orderBy: { name: "asc" },
  });

  // Also filter out users with simulator in roleTitle
  const allEligible = allUsers.filter((u: { roleTitle?: string | null }) =>
    !u.roleTitle?.includes("סימולטור") && !u.roleTitle?.includes("simulator")
  ) as EligibleUser[];

  // For guard: also exclude no-guard exemptions. For obs: everyone is eligible.
  const guardEligible = allEligible.filter(u => {
    const rule = getPersonalRule(u.name);
    return rule?.type !== "no-guard";
  });
  const obsEligible = allEligible; // everyone can do עב"ס

  // Get historical hours for fairness
  const allAssignments = await prisma.dutyAssignment.findMany({
    select: { userId: true, timeSlot: true, role: true },
  });

  const hoursMap: Record<string, number> = {};
  for (const a of allAssignments) {
    if (DAY_ROLES.includes(a.role)) continue;
    if (RESERVE_ROLES.includes(a.role)) continue;
    const h = parseTimeSlot(a.timeSlot).hours || parseTimeSlot(a.role).hours;
    if (h > 0) hoursMap[a.userId] = (hoursMap[a.userId] || 0) + h;
  }

  // ─── טבלת צדק: accumulated fairness debt ───
  const fairnessRecords = await prisma.dutyFairness.findMany({
    select: { userId: true, debt: true },
  });
  const debtMap: Record<string, number> = {};
  for (const f of fairnessRecords) {
    debtMap[f.userId] = (debtMap[f.userId] || 0) + f.debt;
  }

  // Check existing tables for cross-table overlaps
  const existingTables = await prisma.dutyTable.findMany({
    where: { date },
    include: { assignments: true },
  });

  const userBusy: Record<string, string[]> = {};
  for (const t of existingTables) {
    for (const a of t.assignments) {
      if (DAY_ROLES.includes(a.role)) continue;
      if (!userBusy[a.userId]) userBusy[a.userId] = [];
      const timeRange = a.note || a.timeSlot;
      if (timeRange.includes("-")) userBusy[a.userId].push(timeRange);
    }
  }

  const result: Record<string, {
    title: string;
    roles: string[];
    timeSlots: string[];
    assignments: { userId: string; timeSlot: string; role: string }[];
    stats: { totalHours: number; usersUsed: number; fairnessScore: number };
  }> = {};

  if (types.includes("kitchen")) {
    result.kitchen = buildKitchenTable(allEligible, hoursMap, debtMap);
  }

  if (types.includes("guard")) {
    result.guard = buildGuardTable(guardEligible, hoursMap, debtMap, userBusy);
  }

  if (types.includes("obs")) {
    if (result.guard) {
      for (const a of result.guard.assignments) {
        if (DAY_ROLES.includes(a.role)) continue;
        if (!userBusy[a.userId]) userBusy[a.userId] = [];
        userBusy[a.userId].push(a.timeSlot);
      }
    }
    result.obs = buildObsTable(obsEligible, hoursMap, debtMap, userBusy);
  }

  // ─── עב"ס גדודי: 1 person per team (14-17), weekly rotation ───
  let obsGdudi: { userId: string; name: string; team: number }[] = [];
  if (types.includes("guard") || types.includes("obs")) {
    const TEAMS = [14, 15, 16, 17];
    const allAssigned = new Set<string>();
    if (result.guard) result.guard.assignments.forEach(a => allAssigned.add(a.userId));
    if (result.obs) result.obs.assignments.forEach(a => allAssigned.add(a.userId));

    for (const team of TEAMS) {
      const teamMembers = allEligible.filter(u => u.team === team);
      if (teamMembers.length === 0) continue;

      const sorted = [...teamMembers].sort((a, b) => {
        const aDebt = debtMap[a.id] || 0;
        const bDebt = debtMap[b.id] || 0;
        const aBusy = allAssigned.has(a.id) ? 1 : 0;
        const bBusy = allAssigned.has(b.id) ? 1 : 0;
        if (aBusy !== bBusy) return aBusy - bBusy;
        return aDebt - bDebt;
      });

      obsGdudi.push({ userId: sorted[0].id, name: sorted[0].name, team });
    }
  }

  return NextResponse.json({ success: true, tables: result, obsGdudi });
}
