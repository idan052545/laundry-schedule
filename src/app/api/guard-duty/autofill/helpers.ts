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
): EligibleUser | null {
  // Score each user — lower score = higher priority
  const scored = users.map(u => {
    const hist = hoursMap[u.id] || 0;
    const local = (localAssignments[u.id] || [])
      .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role))
      .reduce((sum, a) => {
        const h = parseTimeSlot(a.timeSlot).hours;
        return sum + (h > 0 ? h : 0);
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

    // debt is weighted x2 to make fairness correction stronger than raw hours
    return { user: u, score: hist + local + (debt * 2) + squadBonus, localCount };
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

    const busy = userBusy[user.id] || [];
    const hasOverlap = busy.some(b => b.includes("-") && slotsOverlap(b, timeSlot));
    if (hasOverlap) continue;

    const localSlots = (localAssignments[user.id] || [])
      .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
      .map(a => a.timeSlot);
    const hasLocalOverlap = localSlots.some(s => slotsOverlap(s, timeSlot));
    if (hasLocalOverlap) continue;

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
