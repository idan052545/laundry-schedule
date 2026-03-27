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

  // Get all eligible users (exclude sagal, simulator roles — admin excluded below with exception)
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: ["sagal", "simulator", "simulator-admin"] } },
    select: { id: true, name: true, nameEn: true, team: true, image: true, role: true, roleTitle: true, roomNumber: true },
    orderBy: { name: "asc" },
  });

  // Admins to include in autofill (exception list)
  const ADMIN_EXCEPTIONS = ["עידן חן סימנטוב"];

  // Filter out: simulators by roleTitle, and admins (except exceptions)
  const allEligible = allUsers.filter((u: { role: string; name: string; roleTitle?: string | null }) => {
    if (u.roleTitle?.includes("סימולטור") || u.roleTitle?.includes("simulator")) return false;
    if (u.role === "admin" && !ADMIN_EXCEPTIONS.some(name => u.name.includes(name))) return false;
    return true;
  }) as EligibleUser[];

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
    assignments: { userId: string; timeSlot: string; role: string; note?: string }[];
    stats: { totalHours: number; usersUsed: number; fairnessScore: number };
  }> = {};

  if (types.includes("kitchen")) {
    result.kitchen = buildKitchenTable(allEligible, hoursMap, debtMap);
  }

  if (types.includes("guard")) {
    result.guard = buildGuardTable(guardEligible, hoursMap, debtMap, userBusy);
  }

  if (types.includes("obs")) {
    // Combine guard hours from current autofill into hoursMap so obs fairness
    // accounts for total שמירות + עב"ס hours together
    const combinedHoursMap = { ...hoursMap };
    if (result.guard) {
      for (const a of result.guard.assignments) {
        if (DAY_ROLES.includes(a.role)) continue;
        if (RESERVE_ROLES.includes(a.role)) continue;
        const h = parseTimeSlot(a.note || a.timeSlot).hours;
        if (h > 0) combinedHoursMap[a.userId] = (combinedHoursMap[a.userId] || 0) + h;
        // Also mark as busy for overlap check
        if (!userBusy[a.userId]) userBusy[a.userId] = [];
        userBusy[a.userId].push(a.note || a.timeSlot);
      }
    }
    result.obs = buildObsTable(obsEligible, combinedHoursMap, debtMap, userBusy);
  }

  // ─── Compute combined fairness across guard + obs ───
  if (result.guard && result.obs) {
    const combinedUserHours: Record<string, number> = {};
    for (const a of result.guard.assignments) {
      if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
      const h = parseTimeSlot(a.note || a.timeSlot).hours;
      if (h > 0) combinedUserHours[a.userId] = (combinedUserHours[a.userId] || 0) + h;
    }
    for (const a of result.obs.assignments) {
      const h = parseTimeSlot(a.role).hours;
      if (h > 0) combinedUserHours[a.userId] = (combinedUserHours[a.userId] || 0) + h;
    }
    const vals = Object.values(combinedUserHours);
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const variance = vals.length > 0 ? vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length : 0;
    const combinedFairness = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;
    const rounded = Math.round(combinedFairness);

    // Override both tables with the combined score
    result.guard.stats.fairnessScore = rounded;
    result.obs.stats.fairnessScore = rounded;
  }

  // ─── עב"ס גדודי: 3 people (one per obs shift), rotating through teams ───
  let obsGdudi: { userId: string; name: string; team: number; obsShift: string }[] = [];
  if (types.includes("guard") || types.includes("obs")) {
    const TEAMS = [14, 15, 16, 17];
    const OBS_SHIFTS = ["08:30-11:30", "13:30-17:30", "18:30-20:00"];
    const allAssigned = new Set<string>();
    if (result.guard) result.guard.assignments.forEach(a => allAssigned.add(a.userId));
    if (result.obs) result.obs.assignments.forEach(a => allAssigned.add(a.userId));

    // Check who already did עב"ס גדודי (stored in metadata of past guard tables)
    const pastGuardTables = await prisma.dutyTable.findMany({
      where: { type: "guard", metadata: { not: null } },
      select: { metadata: true },
    });
    const pastObsGdudiNames = new Set<string>();
    for (const t of pastGuardTables) {
      try {
        const meta = JSON.parse(t.metadata!);
        if (meta.obsGdudi && Array.isArray(meta.obsGdudi)) {
          for (const entry of meta.obsGdudi) {
            // Could be string (name) or object
            if (typeof entry === "string") pastObsGdudiNames.add(entry);
            else if (entry.name) pastObsGdudiNames.add(entry.name);
          }
        }
      } catch { /* ignore */ }
    }

    // Collect candidates from all teams, prefer those who haven't done it yet
    const candidates: { id: string; name: string; team: number; didBefore: boolean; debt: number; busy: boolean }[] = [];
    for (const team of TEAMS) {
      const teamMembers = allEligible.filter(u => u.team === team);
      for (const u of teamMembers) {
        candidates.push({
          id: u.id,
          name: u.name,
          team,
          didBefore: pastObsGdudiNames.has(u.name),
          debt: debtMap[u.id] || 0,
          busy: allAssigned.has(u.id),
        });
      }
    }

    // Sort: not-done-before first, then not-busy, then lowest debt
    candidates.sort((a, b) => {
      if (a.didBefore !== b.didBefore) return a.didBefore ? 1 : -1;
      if (a.busy !== b.busy) return a.busy ? 1 : -1;
      return a.debt - b.debt;
    });

    // Pick 3 people from different teams
    const usedTeams = new Set<number>();
    const picked: typeof candidates = [];
    for (const c of candidates) {
      if (picked.length >= 3) break;
      if (usedTeams.has(c.team)) continue;
      usedTeams.add(c.team);
      picked.push(c);
    }

    // Assign each to an obs shift
    for (let i = 0; i < picked.length; i++) {
      obsGdudi.push({
        userId: picked[i].id,
        name: picked[i].name,
        team: picked[i].team,
        obsShift: OBS_SHIFTS[i],
      });
    }
  }

  return NextResponse.json({ success: true, tables: result, obsGdudi });
}
