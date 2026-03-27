import { DAY_ROLES, RESERVE_ROLES, SLOT_ROLE_COUNTS, SLOT_ROLE_NOTES, SQUADS } from "./constants";
import { canAssignToSlot, canUserTakeRole, findBestCandidate, isNightSlot, nameMatch, NIGHT_WEIGHT, parseTimeSlot, slotsOverlap, hasEnoughRest, isFemaleByRoom, weightedHours } from "./helpers";
import type { EligibleUser, TableResult } from "./types";

type Assignment = { userId: string; timeSlot: string; role: string; note?: string };

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

  const assignments: Assignment[] = [];
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
  // Sort rooms by average debt of eligible members (lowest debt = most overdue for כ"כ)
  kkCandidateRooms.sort((a, b) => {
    const avgDebtA = a.eligible.reduce((s, u) => s + (debtMap[u.id] || 0), 0) / a.eligible.length;
    const avgDebtB = b.eligible.reduce((s, u) => s + (debtMap[u.id] || 0), 0) / b.eligible.length;
    return avgDebtA - avgDebtB || b.eligible.length - a.eligible.length;
  });

  const usedKkRooms = new Set<string>();
  for (const dayRole of DAY_ROLES) {
    const roomEntry = kkCandidateRooms.find(r => !usedKkRooms.has(r.room));
    if (!roomEntry) continue;

    usedKkRooms.add(roomEntry.room);
    const candidates = [...roomEntry.eligible];
    candidates.sort((a, b) => {
      const scoreA = (hoursMap[a.id] || 0) + (debtMap[a.id] || 0) * 2;
      const scoreB = (hoursMap[b.id] || 0) + (debtMap[b.id] || 0) * 2;
      return scoreA - scoreB;
    });
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

  // Pre-compute candidate counts per slot×role for "fewest candidates first" strategy
  const candidateCounts: Record<string, number> = {};
  for (const { slot, role } of slotRolePairs) {
    const key = `${slot}|${role}`;
    candidateCounts[key] = users.filter(u => canUserTakeRole(u.name, role, slot, "guard")).length;
  }

  // Compute global target: total weighted hours / eligible users
  const totalWeightedHours = slotRolePairs.reduce((s, p) => {
    if (RESERVE_ROLES.includes(p.role)) return s;
    const noteConfig = SLOT_ROLE_NOTES[p.role]?.[p.slot];
    let h = 0;
    for (let i = 0; i < p.count; i++) {
      const note = noteConfig?.[i];
      h += weightedHours(p.slot, note || p.slot);
    }
    return s + h;
  }, 0);
  const eligibleCount = users.filter(u => canUserTakeRole(u.name, "פטל", "09:00-12:00", "guard")).length;
  const targetHoursPerPerson = eligibleCount > 0 ? totalWeightedHours / eligibleCount : 0;

  // ─── 3. Try multiple orderings to find best complete assignment ───
  const MAX_ATTEMPTS = 14;
  let bestResult = { assignments: [...assignments], localAssignments: { ...localAssignments }, filled: 0, fairness: 0, score: -Infinity };

  // Cross-attempt learning: track users that were hard to place
  const hardToPlace: Record<string, number> = {};

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tryAssignments = [...assignments];
    const tryLocal: Record<string, { role: string; timeSlot: string }[]> = {};
    for (const [k, v] of Object.entries(localAssignments)) tryLocal[k] = [...v];
    const tryBusy: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(userBusy)) tryBusy[k] = [...v];

    const sorted = [...slotRolePairs];
    if (attempt === 0) {
      // Hardest slots first (nights, multi-person)
      sorted.sort((a, b) => b.hardness - a.hardness);
    } else if (attempt === 1) {
      // Restricted roles first, then hardness
      sorted.sort((a, b) => {
        const aRestricted = SLOT_ROLE_COUNTS[a.role] ? 1 : 0;
        const bRestricted = SLOT_ROLE_COUNTS[b.role] ? 1 : 0;
        return bRestricted - aRestricted || b.hardness - a.hardness;
      });
    } else if (attempt === 2) {
      // Heaviest hours first — fill longest shifts first for better fairness
      sorted.sort((a, b) => {
        const aH = parseTimeSlot(a.slot).hours;
        const bH = parseTimeSlot(b.slot).hours;
        return bH - aH || b.hardness - a.hardness;
      });
    } else if (attempt === 3) {
      // Round-robin by slot: interleave slots for better spread
      const bySlot: Record<string, typeof sorted> = {};
      for (const p of sorted) {
        if (!bySlot[p.slot]) bySlot[p.slot] = [];
        bySlot[p.slot].push(p);
      }
      sorted.length = 0;
      const slotKeys = Object.keys(bySlot);
      const maxLen = Math.max(...slotKeys.map(k => bySlot[k].length));
      for (let i = 0; i < maxLen; i++) {
        for (const key of slotKeys) {
          if (bySlot[key][i]) sorted.push(bySlot[key][i]);
        }
      }
    } else if (attempt === 4) {
      // Fewest eligible candidates first — most constrained slots filled first
      sorted.sort((a, b) => {
        const aCand = candidateCounts[`${a.slot}|${a.role}`] || 999;
        const bCand = candidateCounts[`${b.slot}|${b.role}`] || 999;
        return aCand - bCand || b.hardness - a.hardness;
      });
    } else if (attempt === 5) {
      // Night shifts first, then day
      sorted.sort((a, b) => {
        const aIsNight = isNightSlot(a.slot) ? 0 : 1;
        const bIsNight = isNightSlot(b.slot) ? 0 : 1;
        return aIsNight - bIsNight || b.hardness - a.hardness;
      });
    } else if (attempt === 6) {
      // Reverse chronological — late shifts first
      sorted.sort((a, b) => {
        const aStart = parseTimeSlot(a.slot).startMin;
        const bStart = parseTimeSlot(b.slot).startMin;
        const aNorm = aStart < 480 ? aStart + 1440 : aStart;
        const bNorm = bStart < 480 ? bStart + 1440 : bStart;
        return bNorm - aNorm || b.hardness - a.hardness;
      });
    } else if (attempt === 7) {
      // Fewest candidates + hardness combined (learned from previous attempts)
      sorted.sort((a, b) => {
        const aCand = candidateCounts[`${a.slot}|${a.role}`] || 999;
        const bCand = candidateCounts[`${b.slot}|${b.role}`] || 999;
        // Weight both factors
        const aScore = aCand * 2 - a.hardness;
        const bScore = bCand * 2 - b.hardness;
        return aScore - bScore;
      });
    } else {
      // Random with hardness bias (attempts 8-13)
      sorted.sort((a, b) => (b.hardness + Math.random() * 12 - 6) - (a.hardness + Math.random() * 12 - 6));
    }

    let filled = 0;
    const nightCount: Record<string, number> = {};

    for (const { slot, role, count } of sorted) {
      const isReserve = RESERVE_ROLES.includes(role);
      const noteConfig = SLOT_ROLE_NOTES[role]?.[slot];
      const { startMin } = parseTimeSlot(slot);
      const startHour = startMin / 60;
      const isNight = startHour >= 20 || startHour < 8;

      for (let i = 0; i < count; i++) {
        const note = noteConfig?.[i];
        const slotH = parseTimeSlot(note || slot).hours;

        // For night slots, filter out people who already have 2+ night shifts
        const eligibleForSlot = isNight && !isReserve
          ? users.filter(u => (nightCount[u.id] || 0) < 2)
          : users;

        const candidate = findBestCandidate(
          eligibleForSlot, hoursMap, debtMap, tryLocal, tryBusy, slot, role, false, isReserve, squadMembers, "guard", slotH, targetHoursPerPerson
        );
        if (!candidate && isNight && !isReserve) {
          // Fallback: allow any user if night-limited pool failed
          const fallback = findBestCandidate(
            users, hoursMap, debtMap, tryLocal, tryBusy, slot, role, false, isReserve, squadMembers, "guard", slotH, targetHoursPerPerson
          );
          if (fallback) {
            tryAssignments.push({ userId: fallback.id, timeSlot: slot, role, ...(note ? { note } : {}) });
            if (!tryLocal[fallback.id]) tryLocal[fallback.id] = [];
            tryLocal[fallback.id].push({ role, timeSlot: slot });
            if (!tryBusy[fallback.id]) tryBusy[fallback.id] = [];
            if (!isReserve) tryBusy[fallback.id].push(note || slot);
            nightCount[fallback.id] = (nightCount[fallback.id] || 0) + 1;
            filled++;
          } else {
            hardToPlace[`${slot}|${role}`] = (hardToPlace[`${slot}|${role}`] || 0) + 1;
          }
        } else if (candidate) {
          tryAssignments.push({ userId: candidate.id, timeSlot: slot, role, ...(note ? { note } : {}) });
          if (!tryLocal[candidate.id]) tryLocal[candidate.id] = [];
          tryLocal[candidate.id].push({ role, timeSlot: slot });
          if (!tryBusy[candidate.id]) tryBusy[candidate.id] = [];
          if (!isReserve) tryBusy[candidate.id].push(note || slot);
          if (isNight) nightCount[candidate.id] = (nightCount[candidate.id] || 0) + 1;
          filled++;
        } else {
          hardToPlace[`${slot}|${role}`] = (hardToPlace[`${slot}|${role}`] || 0) + 1;
        }
      }
    }

    // ─── Post-assignment: redistribute to unassigned people ───
    const assignedUserIds = new Set(tryAssignments.map(a => a.userId));
    const unassignedUsers = users.filter(u =>
      !assignedUserIds.has(u.id) && canUserTakeRole(u.name, "פטל", "09:00-12:00", "guard")
    );

    for (const unassigned of unassignedUsers) {
      // Find the person with the most weighted hours
      const userWH: Record<string, number> = {};
      for (const a of tryAssignments) {
        if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
        userWH[a.userId] = (userWH[a.userId] || 0) + weightedHours(a.timeSlot, a.note || a.timeSlot);
      }
      const overloadedEntries = Object.entries(userWH).sort((a, b) => b[1] - a[1]);

      let redistributed = false;
      for (const [overloadedId] of overloadedEntries) {
        // Find a shift from the overloaded person that the unassigned person can take
        const overloadedShifts = tryAssignments
          .map((a, idx) => ({ ...a, idx }))
          .filter(a => a.userId === overloadedId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));

        for (const shift of overloadedShifts) {
          const busy = tryBusy[unassigned.id] || [];
          const localSlots = (tryLocal[unassigned.id] || [])
            .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
            .map(a => a.timeSlot);

          if (canAssignToSlot(unassigned, shift.timeSlot, shift.role, busy, localSlots, tryLocal[unassigned.id] || [], "guard")) {
            // Check gender pairing for night shifts
            if (isNightSlot(shift.timeSlot)) {
              const partners = tryAssignments.filter(a =>
                a.userId !== overloadedId && a.role === shift.role && a.timeSlot === shift.timeSlot
              );
              if (partners.length > 0) {
                const partnerUser = users.find(u => u.id === partners[0].userId);
                if (partnerUser && isFemaleByRoom(partnerUser.roomNumber) !== isFemaleByRoom(unassigned.roomNumber)) continue;
              }
            }

            // Transfer the shift
            tryAssignments[shift.idx] = { ...tryAssignments[shift.idx], userId: unassigned.id };
            // Update local tracking
            if (!tryLocal[unassigned.id]) tryLocal[unassigned.id] = [];
            tryLocal[unassigned.id].push({ role: shift.role, timeSlot: shift.timeSlot });
            tryLocal[overloadedId] = (tryLocal[overloadedId] || []).filter(a =>
              !(a.role === shift.role && a.timeSlot === shift.timeSlot)
            );
            redistributed = true;
            break;
          }
        }
        if (redistributed) break;
      }
    }

    // ─── Post-assignment: pairwise swap optimization ───
    const computeWH = (): Record<string, number> => {
      const h: Record<string, number> = {};
      for (const a of tryAssignments) {
        if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
        h[a.userId] = (h[a.userId] || 0) + weightedHours(a.timeSlot, a.note || a.timeSlot);
      }
      return h;
    };

    for (let swapRound = 0; swapRound < 50; swapRound++) {
      const userWH = computeWH();
      const entries = Object.entries(userWH).sort((a, b) => b[1] - a[1]);
      if (entries.length < 2) break;

      let improved = false;

      // Pairwise swaps: high-hours ↔ low-hours
      for (let hi = 0; hi < Math.min(8, entries.length) && !improved; hi++) {
        for (let lo = entries.length - 1; lo >= Math.max(entries.length - 8, hi + 1) && !improved; lo--) {
          const [highId, highWH] = entries[hi];
          const [lowId, lowWH] = entries[lo];
          if (highWH - lowWH < 1.5) continue;

          const highShifts = tryAssignments
            .map((a, idx) => ({ ...a, idx }))
            .filter(a => a.userId === highId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));
          const lowShifts = tryAssignments
            .map((a, idx) => ({ ...a, idx }))
            .filter(a => a.userId === lowId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));

          // Try swap: give high's heavy shift to low, low's light shift to high
          for (const ha of highShifts) {
            const haWH = weightedHours(ha.timeSlot, ha.note || ha.timeSlot);
            for (const la of lowShifts) {
              const laWH = weightedHours(la.timeSlot, la.note || la.timeSlot);
              if (haWH <= laWH) continue;

              const highUser = users.find(u => u.id === highId);
              const lowUser = users.find(u => u.id === lowId);
              if (!highUser || !lowUser) continue;

              // Validate constraints for both sides
              const highBusy = (tryBusy[highId] || []);
              const lowBusy = (tryBusy[lowId] || []);
              const highLocalSlots = (tryLocal[highId] || [])
                .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
                .filter(a => !(a.role === ha.role && a.timeSlot === ha.timeSlot))
                .map(a => a.timeSlot);
              const lowLocalSlots = (tryLocal[lowId] || [])
                .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
                .filter(a => !(a.role === la.role && a.timeSlot === la.timeSlot))
                .map(a => a.timeSlot);

              // Can high take low's shift?
              if (!canAssignToSlot(highUser, la.timeSlot, la.role, highBusy, highLocalSlots, tryLocal[highId] || [], "guard")) continue;
              // Can low take high's shift?
              if (!canAssignToSlot(lowUser, ha.timeSlot, ha.role, lowBusy, lowLocalSlots, tryLocal[lowId] || [], "guard")) continue;

              // Verify improvement
              const newHighWH = highWH - haWH + laWH;
              const newLowWH = lowWH - laWH + haWH;
              const oldDiff = Math.abs(highWH - lowWH);
              const newDiff = Math.abs(newHighWH - newLowWH);
              if (newDiff >= oldDiff) continue;

              // Perform swap
              tryAssignments[ha.idx] = { ...tryAssignments[ha.idx], userId: lowId };
              tryAssignments[la.idx] = { ...tryAssignments[la.idx], userId: highId };
              // Update local tracking
              tryLocal[highId] = (tryLocal[highId] || []).filter(a => !(a.role === ha.role && a.timeSlot === ha.timeSlot));
              tryLocal[highId].push({ role: la.role, timeSlot: la.timeSlot });
              tryLocal[lowId] = (tryLocal[lowId] || []).filter(a => !(a.role === la.role && a.timeSlot === la.timeSlot));
              tryLocal[lowId].push({ role: ha.role, timeSlot: ha.timeSlot });
              improved = true;
            }
          }

          // Try move: give high's shift to low without taking anything back (if low has fewer shifts)
          if (!improved) {
            const lowCount = lowShifts.length;
            const highCount = highShifts.length;
            if (highCount > lowCount + 1) {
              for (const ha of highShifts) {
                const lowUser = users.find(u => u.id === lowId);
                if (!lowUser) continue;
                const lowBusy = (tryBusy[lowId] || []);
                const lowLocalSlots = (tryLocal[lowId] || [])
                  .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role) && a.timeSlot.includes("-"))
                  .map(a => a.timeSlot);
                if (canAssignToSlot(lowUser, ha.timeSlot, ha.role, lowBusy, lowLocalSlots, tryLocal[lowId] || [], "guard")) {
                  tryAssignments[ha.idx] = { ...tryAssignments[ha.idx], userId: lowId };
                  tryLocal[highId] = (tryLocal[highId] || []).filter(a => !(a.role === ha.role && a.timeSlot === ha.timeSlot));
                  if (!tryLocal[lowId]) tryLocal[lowId] = [];
                  tryLocal[lowId].push({ role: ha.role, timeSlot: ha.timeSlot });
                  improved = true;
                  break;
                }
              }
            }
          }
        }
      }

      // 3-opt cycle swap: A→B, B→C, C→A (unlocks swaps that pairwise can't find)
      if (!improved && entries.length >= 3) {
        const topN = Math.min(6, entries.length);
        const botN = Math.min(6, entries.length);
        outer:
        for (let ai = 0; ai < topN; ai++) {
          for (let bi = ai + 1; bi < entries.length; bi++) {
            for (let ci = Math.max(entries.length - botN, bi + 1); ci < entries.length; ci++) {
              const [aId, aWH] = entries[ai];
              const [bId, bWH] = entries[bi];
              const [cId, cWH] = entries[ci];

              // Find one shift from each
              const aShifts = tryAssignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === aId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));
              const bShifts = tryAssignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === bId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));
              const cShifts = tryAssignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === cId && !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role));

              if (!aShifts.length || !bShifts.length || !cShifts.length) continue;

              // Try: A gets C's shift, B gets A's shift, C gets B's shift
              for (const aS of aShifts.slice(0, 3)) {
                for (const bS of bShifts.slice(0, 3)) {
                  for (const cS of cShifts.slice(0, 3)) {
                    const aUser = users.find(u => u.id === aId);
                    const bUser = users.find(u => u.id === bId);
                    const cUser = users.find(u => u.id === cId);
                    if (!aUser || !bUser || !cUser) continue;

                    // A takes C's shift
                    if (!canUserTakeRole(aUser.name, cS.role, cS.timeSlot, "guard")) continue;
                    // B takes A's shift
                    if (!canUserTakeRole(bUser.name, aS.role, aS.timeSlot, "guard")) continue;
                    // C takes B's shift
                    if (!canUserTakeRole(cUser.name, bS.role, bS.timeSlot, "guard")) continue;

                    const aSWH = weightedHours(aS.timeSlot, aS.note || aS.timeSlot);
                    const bSWH = weightedHours(bS.timeSlot, bS.note || bS.timeSlot);
                    const cSWH = weightedHours(cS.timeSlot, cS.note || cS.timeSlot);

                    const newAWH = aWH - aSWH + cSWH;
                    const newBWH = bWH - bSWH + aSWH;
                    const newCWH = cWH - cSWH + bSWH;

                    const oldVar = (aWH ** 2 + bWH ** 2 + cWH ** 2) / 3;
                    const newVar = (newAWH ** 2 + newBWH ** 2 + newCWH ** 2) / 3;

                    if (newVar >= oldVar) continue;

                    // Perform cycle swap
                    tryAssignments[aS.idx] = { ...tryAssignments[aS.idx], userId: bId };
                    tryAssignments[bS.idx] = { ...tryAssignments[bS.idx], userId: cId };
                    tryAssignments[cS.idx] = { ...tryAssignments[cS.idx], userId: aId };
                    improved = true;
                    break outer;
                  }
                }
              }
            }
          }
        }
      }

      if (!improved) break;
    }

    // ─── Score this attempt ───
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

    // Combined score: coverage is king, then fairness, penalize unassigned people
    const assignedCount = new Set(tryAssignments.map(a => a.userId)).size;
    const tryScore = filled * 1000 + tryFairness * 10 + assignedCount;

    if (tryScore > bestResult.score) {
      bestResult = { assignments: tryAssignments, localAssignments: tryLocal, filled, fairness: tryFairness, score: tryScore };
    }

    if (filled >= totalNeeded && tryFairness >= 85) break;
  }

  const finalAssignments = bestResult.assignments;

  // Compute stats
  const usedUsers = new Set(finalAssignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of finalAssignments) {
    if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
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
