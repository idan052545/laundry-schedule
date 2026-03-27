import { DAY_ROLES, RESERVE_ROLES, SLOT_ROLE_COUNTS, SLOT_ROLE_NOTES, SQUADS } from "./constants";
import { canUserTakeRole, findBestCandidate, nameMatch, parseTimeSlot } from "./helpers";
import type { EligibleUser, TableResult } from "./types";

export function buildGuardTable(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
  userBusy: Record<string, string[]>,
): TableResult {
  const roles = [
    "שג רכוב קדמי", "שג רכוב אחורי", "שג רגלי", "פטל",
    'ימ"ח', "בונקר", "נשקייה", "תצפיתן", "עתודה", 'כ"כא', 'כ"כב',
  ];
  const slots = ["09:00-12:00", "12:00-16:00", "16:00-20:00", "20:00-00:00", "00:00-04:00", "04:00-08:00"];

  const assignments: { userId: string; timeSlot: string; role: string; note?: string }[] = [];
  const localAssignments: Record<string, { role: string; timeSlot: string }[]> = {};

  // Build squad member id sets
  const squadMembers: { squadIdx: number; userIds: string[] }[] = SQUADS.map((squad, idx) => ({
    squadIdx: idx,
    userIds: squad.map((name) => {
      const u = users.find(u => nameMatch(u.name, name));
      return u?.id;
    }).filter(Boolean) as string[],
  }));

  // Build room→users map for כ"כ assignment
  const roomUsers: Record<string, EligibleUser[]> = {};
  for (const u of users) {
    if (!u.roomNumber) continue;
    if (!roomUsers[u.roomNumber]) roomUsers[u.roomNumber] = [];
    roomUsers[u.roomNumber].push(u);
  }

  // ─── 1. Assign כ"כא and כ"כב (5 people each, all from same room) ───
  const kkCandidateRooms: { room: string; eligible: EligibleUser[] }[] = [];
  for (const [room, roomMembers] of Object.entries(roomUsers)) {
    const eligible = roomMembers.filter(u => canUserTakeRole(u.name, 'כ"כא', "08:00-12:00"));
    if (eligible.length >= 5) {
      kkCandidateRooms.push({ room, eligible });
    }
  }
  kkCandidateRooms.sort((a, b) => b.eligible.length - a.eligible.length);

  const usedKkRooms = new Set<string>();
  for (const dayRole of DAY_ROLES) {
    const roomEntry = kkCandidateRooms.find(r => !usedKkRooms.has(r.room));
    if (!roomEntry) continue;

    usedKkRooms.add(roomEntry.room);
    const candidates = [...roomEntry.eligible];
    candidates.sort((a, b) => (hoursMap[a.id] || 0) - (hoursMap[b.id] || 0));
    const picked = candidates.slice(0, 5);

    for (const u of picked) {
      assignments.push({ userId: u.id, timeSlot: slots[0], role: dayRole });
      if (!localAssignments[u.id]) localAssignments[u.id] = [];
      localAssignments[u.id].push({ role: dayRole, timeSlot: "day" });
    }
  }

  // ─── 2. Build slot×role work items ───
  const slotRolePairs: { slot: string; role: string; count: number; hardness: number }[] = [];

  for (const slot of slots) {
    const { startMin } = parseTimeSlot(slot);
    const startHour = startMin / 60;

    for (const role of roles) {
      if (DAY_ROLES.includes(role)) continue;

      const slotCounts = SLOT_ROLE_COUNTS[role];
      const count = slotCounts ? (slotCounts[slot] ?? 1) : 1;
      if (count === 0) continue;

      let hardness = 0;
      if (startHour >= 20 || startHour < 8) hardness += 10;
      if (startHour >= 0 && startHour < 8) hardness += 5;
      if (RESERVE_ROLES.includes(role)) hardness -= 20;
      if (count > 1) hardness += 3;

      slotRolePairs.push({ slot, role, count, hardness });
    }
  }

  const totalNeeded = slotRolePairs.reduce((s, p) => s + p.count, 0);

  // ─── 3. Try multiple orderings to find best complete assignment ───
  const MAX_ATTEMPTS = 5;
  let bestResult = { assignments: [...assignments], localAssignments: { ...localAssignments }, filled: 0, fairness: 0 };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tryAssignments = [...assignments];
    const tryLocal: Record<string, { role: string; timeSlot: string }[]> = {};
    for (const [k, v] of Object.entries(localAssignments)) tryLocal[k] = [...v];
    const tryBusy: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(userBusy)) tryBusy[k] = [...v];

    const sorted = [...slotRolePairs];
    if (attempt === 0) {
      sorted.sort((a, b) => b.hardness - a.hardness);
    } else if (attempt === 1) {
      sorted.sort((a, b) => {
        const aRestricted = SLOT_ROLE_COUNTS[a.role] ? 1 : 0;
        const bRestricted = SLOT_ROLE_COUNTS[b.role] ? 1 : 0;
        return bRestricted - aRestricted || b.hardness - a.hardness;
      });
    } else {
      sorted.sort((a, b) => (b.hardness + Math.random() * 6 - 3) - (a.hardness + Math.random() * 6 - 3));
    }

    let filled = 0;
    for (const { slot, role, count } of sorted) {
      const isReserve = RESERVE_ROLES.includes(role);
      const noteConfig = SLOT_ROLE_NOTES[role]?.[slot];
      for (let i = 0; i < count; i++) {
        const candidate = findBestCandidate(
          users, hoursMap, debtMap, tryLocal, tryBusy, slot, role, false, isReserve, squadMembers, "guard"
        );
        if (candidate) {
          // Apply partial-time note if defined for this role/slot/position
          const note = noteConfig?.[i];
          tryAssignments.push({ userId: candidate.id, timeSlot: slot, role, ...(note ? { note } : {}) });
          if (!tryLocal[candidate.id]) tryLocal[candidate.id] = [];
          tryLocal[candidate.id].push({ role, timeSlot: slot });
          if (!tryBusy[candidate.id]) tryBusy[candidate.id] = [];
          if (!isReserve) tryBusy[candidate.id].push(note || slot);
          filled++;
        }
      }
    }

    const tryUserHours: Record<string, number> = {};
    for (const a of tryAssignments) {
      if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
      const h = parseTimeSlot(a.note || a.timeSlot).hours;
      tryUserHours[a.userId] = (tryUserHours[a.userId] || 0) + h;
    }
    const hv = Object.values(tryUserHours);
    const tryAvg = hv.length > 0 ? hv.reduce((s, v) => s + v, 0) / hv.length : 0;
    const tryVar = hv.length > 0 ? hv.reduce((s, v) => s + (v - tryAvg) ** 2, 0) / hv.length : 0;
    const tryFairness = tryAvg > 0 ? Math.max(0, 100 - (Math.sqrt(tryVar) / tryAvg) * 100) : 100;

    if (filled > bestResult.filled || (filled === bestResult.filled && tryFairness > bestResult.fairness)) {
      bestResult = { assignments: tryAssignments, localAssignments: tryLocal, filled, fairness: tryFairness };
    }

    if (filled >= totalNeeded) break;
  }

  const finalAssignments = bestResult.assignments;

  // Compute stats
  const usedUsers = new Set(finalAssignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of finalAssignments) {
    if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
    // Use note (partial time) for hours if available, otherwise full slot
    const h = parseTimeSlot(a.note || a.timeSlot).hours;
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return {
    title: "שיבוץ לשמירות",
    roles,
    timeSlots: slots,
    assignments: finalAssignments,
    stats: { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) },
  };
}
