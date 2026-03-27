import {
  DAY_ROLES,
  PERSONAL_RULES,
  RESERVE_ROLES,
  SLOT_ROLE_COUNTS,
  SQUADS,
  type PersonalRule,
} from "./constants";
import type { EligibleUser } from "./types";

// ─── TIME HELPERS ───

export function parseTimeSlot(slot: string): { startMin: number; endMin: number; hours: number } {
  const parts = slot.split("-");
  if (parts.length !== 2) return { startMin: 0, endMin: 0, hours: 0 };
  const [sh, sm] = parts[0].split(":").map(Number);
  const [eh, em] = parts[1].split(":").map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return { startMin: 0, endMin: 0, hours: 0 };
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 1440;
  return { startMin, endMin, hours: (endMin - startMin) / 60 };
}

export function slotsOverlap(a: string, b: string): boolean {
  const pa = parseTimeSlot(a);
  const pb = parseTimeSlot(b);
  return pa.startMin < pb.endMin && pb.startMin < pa.endMin;
}

// Night slots (for exemptions that forbid night)
export function isNightSlot(slot: string): boolean {
  const h = parseInt(slot.split(":")[0]);
  return h >= 20 || h < 8;
}

/** Night hardship multiplier — night hours are harder and count as more */
export const NIGHT_WEIGHT = 1.3;

/** Get weighted hours for a shift (night shifts count as 1.3x) */
export function weightedHours(slot: string, noteOrSlot?: string): number {
  const raw = parseTimeSlot(noteOrSlot || slot).hours;
  return isNightSlot(slot) ? raw * NIGHT_WEIGHT : raw;
}

/** Check if a user has enough rest (7h) before a given shift start.
 *  Returns false if any of their existing shifts ends less than 7 hours before `shiftStart`. */
export function hasEnoughRest(
  shiftStartMin: number,
  existingSlots: string[],
  minRestMinutes: number = 420, // 7 hours
): boolean {
  for (const s of existingSlots) {
    const parsed = parseTimeSlot(s);
    if (parsed.hours === 0) continue;
    const endMin = parsed.endMin;
    const start = shiftStartMin;
    // Check gap: end → start
    let gap = start - endMin;
    if (gap < -720) gap += 1440; // wrap around midnight
    if (gap >= 0 && gap < minRestMinutes) return false;
    // Also check the reverse direction for overnight edge cases
    const gap2 = start + 1440 - endMin;
    if (gap2 >= 0 && gap2 < minRestMinutes && gap < 0) return false;
  }
  return true;
}

/** Check if a user can be assigned to a slot considering all hard constraints (overlap, rest, role eligibility).
 *  Useful for validating swaps. */
export function canAssignToSlot(
  user: EligibleUser,
  timeSlot: string,
  role: string,
  userBusy: string[],
  localSlots: string[],
  localAssignments: { role: string; timeSlot: string }[],
  tableType: "guard" | "obs" = "guard",
): boolean {
  if (!canUserTakeRole(user.name, role, timeSlot, tableType)) return false;
  // Overlap with cross-table busy
  if (userBusy.some(b => b.includes("-") && slotsOverlap(b, timeSlot))) return false;
  // Overlap with local assignments
  if (localSlots.some(s => slotsOverlap(s, timeSlot))) return false;
  // Rest constraint for night shifts
  if (isNightSlot(timeSlot)) {
    const { startMin } = parseTimeSlot(timeSlot);
    const allSlots = [...userBusy.filter(b => b.includes("-")), ...localSlots];
    if (!hasEnoughRest(startMin, allSlots)) return false;
  }
  // Gender pairing for night shifts handled externally
  return true;
}

// ─── NAME / GENDER / SQUAD HELPERS ───

export function nameMatch(dbName: string, ruleName: string): boolean {
  return dbName === ruleName || dbName.includes(ruleName) || ruleName.includes(dbName);
}

// Room 400+ = female, below 400 = male
export function isFemaleByRoom(roomNumber: string | null | undefined): boolean {
  if (!roomNumber) return false;
  const num = parseInt(roomNumber);
  return !isNaN(num) && num >= 400;
}

export function getPersonalRule(userName: string): PersonalRule | null {
  for (const [name, rule] of Object.entries(PERSONAL_RULES)) {
    if (nameMatch(userName, name)) return rule;
  }
  return null;
}

export function getSquadIndex(userName: string): number {
  for (let i = 0; i < SQUADS.length; i++) {
    if (SQUADS[i].some(m => nameMatch(userName, m))) return i;
  }
  return -1;
}

/** Check if a user can take a specific role in a specific time slot.
 *  tableType: "guard" or "obs" — exemptions only apply to guard table */
export function canUserTakeRole(userName: string, role: string, slot: string, tableType: "guard" | "obs" = "guard"): boolean {
  if (tableType === "obs") return true; // all exemptions are guard-only, everyone can do עב"ס
  const rule = getPersonalRule(userName);
  if (!rule) return true;

  switch (rule.type) {
    case "no-guard":
      return false;

    case "roles-only":
      // Can do their allowed roles + כ"כא/כ"כב
      if (DAY_ROLES.includes(role)) return true;
      return rule.allowedRoles!.includes(role);

    case "no-kk":
      return !DAY_ROLES.includes(role);

    case "no-night":
      // No night shifts at all, any day role is fine
      return !isNightSlot(slot);

    case "no-night-must-pair":
      // No night shifts. During day: any role (pair enforced in findBestCandidate)
      return !isNightSlot(slot);

    default:
      return true;
  }
}

// ─── STATS HELPER ───

export function computeStats(
  assignments: { userId: string; timeSlot: string; role: string }[],
  getHours: (a: { userId: string; timeSlot: string; role: string }) => number,
) {
  const usedUsers = new Set(assignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of assignments) {
    const h = getHours(a);
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) };
}

// ─── FIND BEST CANDIDATE ───

export function findBestCandidate(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
  localAssignments: Record<string, { role: string; timeSlot: string }[]>,
  userBusy: Record<string, string[]>,
  timeSlot: string,
  role: string,
  isDayRole: boolean,
  isReserve: boolean,
  squadMembers: { squadIdx: number; userIds: string[] }[],
  tableType: "guard" | "obs" = "guard",
  shiftHours: number = 0,
  targetHoursPerPerson: number = 0,
): EligibleUser | null {
  // Hours of the shift being assigned (for hour-weighted fairness)
  const slotH = shiftHours > 0 ? shiftHours : parseTimeSlot(timeSlot).hours || parseTimeSlot(role).hours;
  const wH = isNightSlot(timeSlot) ? slotH * NIGHT_WEIGHT : slotH;

  // Score each user — lower score = higher priority
  const scored = users.map(u => {
    const hist = hoursMap[u.id] || 0;
    const local = (localAssignments[u.id] || [])
      .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role))
      .reduce((sum, a) => {
        const h = parseTimeSlot(a.timeSlot).hours;
        const w = isNightSlot(a.timeSlot) ? h * NIGHT_WEIGHT : h;
        return sum + (w > 0 ? w : 0);
      }, 0);
    const localCount = (localAssignments[u.id] || []).length;

    // טבלת צדק: accumulated debt from previous dates
    const debt = debtMap[u.id] || 0;

    // Squad bonus: if a squad member is already assigned to this slot, boost priority
    let squadBonus = 0;
    const mySquadIdx = getSquadIndex(u.name);
    if (mySquadIdx >= 0 && squadMembers.length > 0) {
      const squad = squadMembers.find(s => s.squadIdx === mySquadIdx);
      if (squad) {
        const squadMateInSlot = squad.userIds.some(uid =>
          uid !== u.id && (localAssignments[uid] || []).some(a =>
            a.timeSlot === timeSlot && !DAY_ROLES.includes(a.role)
          )
        );
        if (squadMateInSlot) squadBonus = -50;
      }
    }

    // Hour-weighted fairness: projected total if this person gets this shift
    const projected = hist + local + wH;

    // Target deviation: how far from ideal this person would be after assignment
    let targetPenalty = 0;
    if (targetHoursPerPerson > 0) {
      const deviation = projected - targetHoursPerPerson;
      // Penalize going over target more than being under
      targetPenalty = deviation > 0 ? deviation * 1.5 : deviation * 0.3;
    }

    // Penalize back-to-back shifts (consecutive time slots) — people need breaks
    let consecutivePenalty = 0;
    const { startMin: newStart, endMin: newEnd } = parseTimeSlot(timeSlot);
    for (const a of (localAssignments[u.id] || [])) {
      if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
      const existing = parseTimeSlot(a.timeSlot);
      if (existing.hours === 0) continue;
      if (Math.abs(existing.endMin - newStart) <= 30 || Math.abs(newEnd - existing.startMin) <= 30) {
        consecutivePenalty += 8;
      }
    }

    // Shift count penalty: exponential to strongly discourage piling shifts on same person
    // 0 shifts: 0, 1 shift: 0, 2 shifts: +6, 3 shifts: +18, 4 shifts: +36
    const shiftCountPenalty = localCount >= 2 ? (localCount - 1) * (localCount - 1) * 6 : 0;

    // כ"כ penalty: people already assigned to a day role (כ"כא/כ"כב) get penalized for additional shifts
    const hasDayRoleAlready = (localAssignments[u.id] || []).some(a => DAY_ROLES.includes(a.role));
    const dayRolePenalty = hasDayRoleAlready && !isDayRole ? 10 : 0;

    // Unassigned bonus: people with 0 local shifts get a strong boost to ensure everyone participates
    const unassignedBonus = localCount === 0 ? -8 : 0;

    return {
      user: u,
      score: projected + (debt * 2) + squadBonus + consecutivePenalty + shiftCountPenalty + dayRolePenalty + targetPenalty + unassignedBonus,
      localCount,
    };
  });

  // For night multi-person roles: prefer the gender with more available candidates
  const slotCountsForSort = SLOT_ROLE_COUNTS[role];
  const roleCountForSort = slotCountsForSort ? (slotCountsForSort[timeSlot] ?? 1) : 1;
  if (isNightSlot(timeSlot) && roleCountForSort >= 2 && tableType === "guard") {
    const hasPartner = Object.entries(localAssignments).some(([, assgns]) =>
      assgns.some(a => a.role === role && a.timeSlot === timeSlot)
    );
    if (!hasPartner) {
      let maleCount = 0, femaleCount = 0;
      for (const { user } of scored) {
        if (!canUserTakeRole(user.name, role, timeSlot, tableType)) continue;
        const busy = userBusy[user.id] || [];
        if (busy.some(b => b.includes("-") && slotsOverlap(b, timeSlot))) continue;
        const localSlots = (localAssignments[user.id] || [])
          .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
          .map(a => a.timeSlot);
        if (localSlots.some(s => slotsOverlap(s, timeSlot))) continue;
        if (isFemaleByRoom(user.roomNumber)) femaleCount++; else maleCount++;
      }
      const preferFemale = femaleCount >= maleCount;
      scored.sort((a, b) => {
        const aPreferred = isFemaleByRoom(a.user.roomNumber) === preferFemale ? 0 : 1;
        const bPreferred = isFemaleByRoom(b.user.roomNumber) === preferFemale ? 0 : 1;
        return aPreferred - bPreferred || a.score - b.score || a.localCount - b.localCount;
      });
    } else {
      scored.sort((a, b) => a.score - b.score || a.localCount - b.localCount);
    }
  } else {
    scored.sort((a, b) => a.score - b.score || a.localCount - b.localCount);
  }

  for (const { user } of scored) {
    if (!canUserTakeRole(user.name, role, timeSlot, tableType)) continue;

    if (isDayRole) {
      const hasDayRole = (localAssignments[user.id] || []).some(a => DAY_ROLES.includes(a.role));
      if (hasDayRole) continue;
    }

    // Hours-based cap: max 12 weighted hours per person per day (excludes day roles and reserve)
    if (!isDayRole && !isReserve) {
      const currentLocalHours = (localAssignments[user.id] || [])
        .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role))
        .reduce((sum, a) => {
          const h = parseTimeSlot(a.timeSlot).hours;
          return sum + (h > 0 ? h : 0);
        }, 0);
      // Also count cross-table hours from userBusy
      const busyHours = (userBusy[user.id] || [])
        .filter(b => b.includes("-"))
        .reduce((sum, b) => sum + parseTimeSlot(b).hours, 0);
      if (currentLocalHours + busyHours + slotH > 14) continue;
    }

    const busy = userBusy[user.id] || [];
    const hasOverlap = busy.some(b => b.includes("-") && slotsOverlap(b, timeSlot));
    if (hasOverlap) continue;

    const localSlots = (localAssignments[user.id] || [])
      .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
      .map(a => a.timeSlot);
    const hasLocalOverlap = localSlots.some(s => slotsOverlap(s, timeSlot));
    if (hasLocalOverlap) continue;

    // 7-hour rest constraint: ensure enough sleep before night shifts
    if (isNightSlot(timeSlot) && !isReserve) {
      const { startMin } = parseTimeSlot(timeSlot);
      const allExistingSlots = [...busy.filter(b => b.includes("-")), ...localSlots];
      if (!hasEnoughRest(startMin, allExistingSlots)) continue;
    }

    if (isReserve) {
      const alreadyReserve = (localAssignments[user.id] || []).some(a => RESERVE_ROLES.includes(a.role));
      if (alreadyReserve) continue;
    }

    if (tableType === "guard" && isNightSlot(timeSlot)) {
      const partnersInSlot = Object.entries(localAssignments)
        .filter(([uid, assgns]) => uid !== user.id && assgns.some(a => a.role === role && a.timeSlot === timeSlot))
        .map(([uid]) => users.find(u => u.id === uid))
        .filter(Boolean) as EligibleUser[];
      if (partnersInSlot.length > 0) {
        const partnerIsFemale = isFemaleByRoom(partnersInSlot[0].roomNumber);
        const candidateIsFemale = isFemaleByRoom(user.roomNumber);
        if (partnerIsFemale !== candidateIsFemale) continue;
      }
    }

    if (tableType === "guard") {
      const rule = getPersonalRule(user.name);
      if (rule?.type === "no-night-must-pair") {
        const slotCounts = SLOT_ROLE_COUNTS[role];
        const count = slotCounts ? (slotCounts[timeSlot] ?? 1) : 1;
        if (count < 2 && !DAY_ROLES.includes(role)) continue;
      }
    }

    return user;
  }

  return null;
}
