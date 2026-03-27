import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DAY_ROLES, RESERVE_ROLES } from "./constants";
import { canUserTakeRole, getPersonalRule, isFemaleByRoom, isNightSlot, parseTimeSlot, slotsOverlap, hasEnoughRest } from "./helpers";
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
    kkRoleByUser?: Record<string, string>;
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
    // כ"כא cannot do עב"ס, כ"כב can
    const kkRoleByUser = result.guard?.kkRoleByUser || {};
    const obsFiltered = obsEligible.filter(u => kkRoleByUser[u.id] !== 'כ"כא');
    result.obs = buildObsTable(obsFiltered, combinedHoursMap, debtMap, userBusy);
  }

  // ─── Cross-table swap optimization: equalize guard+obs combined hours ───
  if (result.guard && result.obs) {
    const userMap = new Map(allEligible.map(u => [u.id, u]));

    const computeCombined = () => {
      const h: Record<string, number> = {};
      for (const a of result.guard!.assignments) {
        if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
        const hrs = parseTimeSlot(a.note || a.timeSlot).hours;
        if (hrs > 0) h[a.userId] = (h[a.userId] || 0) + hrs;
      }
      for (const a of result.obs!.assignments) {
        const hrs = parseTimeSlot(a.role).hours;
        if (hrs > 0) h[a.userId] = (h[a.userId] || 0) + hrs;
      }
      return h;
    };

    const kkUserIds = new Set<string>();
    const kkRoleByUser = result.guard!.kkRoleByUser || {};
    for (const [uid] of Object.entries(kkRoleByUser)) kkUserIds.add(uid);

    /** Check if a guard swap is valid (role eligibility, time overlap, gender, rest, כ"כ limit) */
    const canSwapGuard = (userId: string, slot: string, role: string, excludeIdx: number) => {
      const user = userMap.get(userId);
      if (!user) return false;
      if (!canUserTakeRole(user.name, role, slot, "guard")) return false;

      // כ"כ constraint: max 1 כ"כ per slot
      if (kkUserIds.has(userId) && !DAY_ROLES.includes(role) && !RESERVE_ROLES.includes(role)) {
        const kkInSlot = result.guard!.assignments.filter((a, i) =>
          i !== excludeIdx && a.timeSlot === slot && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && kkUserIds.has(a.userId)
        ).length;
        if (kkInSlot >= 1) return false;
      }

      // Collect all other slots this user has (guard + obs busy)
      const otherGuardSlots: string[] = [];
      for (let i = 0; i < result.guard!.assignments.length; i++) {
        if (i === excludeIdx) continue;
        const a = result.guard!.assignments[i];
        if (a.userId !== userId) continue;
        if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
        otherGuardSlots.push(a.note || a.timeSlot);
      }
      const obsSlots: string[] = [];
      for (const a of result.obs!.assignments) {
        if (a.userId === userId) obsSlots.push(a.role);
      }
      const allSlots = [...otherGuardSlots, ...obsSlots];

      // Time overlap check
      if (allSlots.some(s => s.includes("-") && slotsOverlap(s, slot))) return false;

      // Rest constraint for night
      if (isNightSlot(slot)) {
        const { startMin } = parseTimeSlot(slot);
        if (!hasEnoughRest(startMin, allSlots.filter(s => s.includes("-")))) return false;
      }

      // Gender pairing for night multi-person roles
      if (isNightSlot(slot)) {
        const partners = result.guard!.assignments.filter((a, i) =>
          i !== excludeIdx && a.role === role && a.timeSlot === slot
        );
        if (partners.length > 0) {
          const partnerUser = userMap.get(partners[0].userId);
          if (partnerUser && isFemaleByRoom(partnerUser.roomNumber) !== isFemaleByRoom(user.roomNumber)) return false;
        }
      }

      return true;
    };

    for (let round = 0; round < 80; round++) {
      const combined = computeCombined();
      const entries = Object.entries(combined).sort((a, b) => b[1] - a[1]);
      if (entries.length < 2) break;

      let improved = false;
      for (let hi = 0; hi < Math.min(12, entries.length) && !improved; hi++) {
        for (let lo = entries.length - 1; lo >= Math.max(entries.length - 12, hi + 1) && !improved; lo--) {
          const [highId, highH] = entries[hi];
          const [lowId, lowH] = entries[lo];
          if (highH - lowH < 1.5) continue;

          // ── Strategy 1: Swap obs shifts (heavy obs ↔ light obs) ──
          const highObs = result.obs!.assignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === highId);
          const lowObs = result.obs!.assignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === lowId);

          for (const ho of highObs) {
            if (improved) break;
            const hoH = parseTimeSlot(ho.role).hours;
            for (const lo2 of lowObs) {
              const loH = parseTimeSlot(lo2.role).hours;
              if (hoH <= loH || ho.role === lo2.role) continue;
              // No duplicate in same shift column
              if (result.obs!.assignments.some((a, i) => a.userId === lowId && a.role === ho.role && i !== lo2.idx)) continue;
              if (result.obs!.assignments.some((a, i) => a.userId === highId && a.role === lo2.role && i !== ho.idx)) continue;

              const newDiff = Math.abs((highH - hoH + loH) - (lowH - loH + hoH));
              if (newDiff >= Math.abs(highH - lowH)) continue;

              result.obs!.assignments[ho.idx] = { ...result.obs!.assignments[ho.idx], userId: lowId };
              result.obs!.assignments[lo2.idx] = { ...result.obs!.assignments[lo2.idx], userId: highId };
              improved = true;
              break;
            }
          }

          // ── Strategy 2: Swap guard shifts (heavy guard ↔ light guard) ──
          if (!improved) {
            const highGuard = result.guard!.assignments.map((a, idx) => ({ ...a, idx }))
              .filter(a => a.userId === highId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));
            const lowGuard = result.guard!.assignments.map((a, idx) => ({ ...a, idx }))
              .filter(a => a.userId === lowId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));

            for (const hg of highGuard) {
              if (improved) break;
              const hgH = parseTimeSlot(hg.note || hg.timeSlot).hours;
              for (const lg of lowGuard) {
                const lgH = parseTimeSlot(lg.note || lg.timeSlot).hours;
                if (hgH <= lgH) continue;

                // Validate both can do each other's role+slot
                if (!canSwapGuard(highId, lg.timeSlot, lg.role, hg.idx)) continue;
                if (!canSwapGuard(lowId, hg.timeSlot, hg.role, lg.idx)) continue;

                const newDiff = Math.abs((highH - hgH + lgH) - (lowH - lgH + hgH));
                if (newDiff >= Math.abs(highH - lowH)) continue;

                result.guard!.assignments[hg.idx] = { ...result.guard!.assignments[hg.idx], userId: lowId };
                result.guard!.assignments[lg.idx] = { ...result.guard!.assignments[lg.idx], userId: highId };
                improved = true;
                break;
              }
            }
          }

          // ── Strategy 3: Move guard shift from high→low (if high has many, low has few) ──
          if (!improved) {
            const highGuard = result.guard!.assignments.map((a, idx) => ({ ...a, idx }))
              .filter(a => a.userId === highId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));
            const lowGuardCount = result.guard!.assignments.filter(a => a.userId === lowId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role)).length;

            if (highGuard.length >= 2 && lowGuardCount <= 1) {
              for (const hg of highGuard) {
                const hgH = parseTimeSlot(hg.note || hg.timeSlot).hours;
                if (!canSwapGuard(lowId, hg.timeSlot, hg.role, hg.idx)) continue;

                const newDiff = Math.abs((highH - hgH) - (lowH + hgH));
                if (newDiff < Math.abs(highH - lowH)) {
                  result.guard!.assignments[hg.idx] = { ...result.guard!.assignments[hg.idx], userId: lowId };
                  improved = true;
                  break;
                }
              }
            }
          }

          // ── Strategy 4: Move obs shift from high→low ──
          if (!improved && highObs.length >= 2 && lowObs.length <= 1) {
            for (const ho of highObs) {
              const hoH = parseTimeSlot(ho.role).hours;
              if (result.obs!.assignments.some((a, i) => a.userId === lowId && a.role === ho.role && i !== ho.idx)) continue;

              const newDiff = Math.abs((highH - hoH) - (lowH + hoH));
              if (newDiff < Math.abs(highH - lowH)) {
                result.obs!.assignments[ho.idx] = { ...result.obs!.assignments[ho.idx], userId: lowId };
                improved = true;
                break;
              }
            }
          }
        }
      }
      if (!improved) break;
    }

    // Compute combined fairness
    const combinedUserHours = computeCombined();
    const vals = Object.values(combinedUserHours);
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const variance = vals.length > 0 ? vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length : 0;
    const combinedFairness = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;
    const rounded = Math.round(combinedFairness);

    result.guard.stats.fairnessScore = rounded;
    result.obs.stats.fairnessScore = rounded;
    // Update stats after swaps
    let guardHours = 0;
    for (const a of result.guard.assignments) {
      if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
      guardHours += parseTimeSlot(a.note || a.timeSlot).hours;
    }
    result.guard.stats.totalHours = guardHours;
    result.guard.stats.usersUsed = new Set(result.guard.assignments.map(a => a.userId)).size;
    const obsHours = result.obs.assignments.reduce((s, a) => s + parseTimeSlot(a.role).hours, 0);
    result.obs.stats.totalHours = obsHours;
    result.obs.stats.usersUsed = new Set(result.obs.assignments.map(a => a.userId)).size;
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
