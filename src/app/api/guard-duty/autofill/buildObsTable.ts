import { canAssignToSlot, findBestCandidate, parseTimeSlot, weightedHours } from "./helpers";
import type { EligibleUser, TableResult } from "./types";

export function buildObsTable(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
  userBusy: Record<string, string[]>,
): TableResult {
  const obsTimeRanges = ["08:30-11:30", "13:30-17:30", "18:30-20:00"];
  const obsPositions = Array.from({ length: 20 }, (_, i) => String(i + 1));

  // Sort shifts by hours descending — assign heaviest shifts first
  const shiftsByHours = [...obsTimeRanges].sort((a, b) => {
    return parseTimeSlot(b).hours - parseTimeSlot(a).hours;
  });

  // Compute target hours per person for obs
  const totalWH = obsTimeRanges.reduce((s, r) => s + weightedHours(r) * obsPositions.length, 0);
  const targetPerPerson = users.length > 0 ? totalWH / users.length : 0;

  const assignments: { userId: string; timeSlot: string; role: string }[] = [];
  const localAssignments: Record<string, { role: string; timeSlot: string }[]> = {};
  const obsShiftCount: Record<string, number> = {};
  const filledPerShift: Record<string, number> = {};
  for (const s of obsTimeRanges) filledPerShift[s] = 0;

  // Pass 1: round-robin across shifts, 1 person per shift max
  for (let pos = 0; pos < obsPositions.length; pos++) {
    for (const timeRange of shiftsByHours) {
      if (filledPerShift[timeRange] >= obsPositions.length) continue;
      const slotH = parseTimeSlot(timeRange).hours;
      const candidate = findBestCandidate(
        users.filter(u => (obsShiftCount[u.id] || 0) < 1),
        hoursMap, debtMap, localAssignments, userBusy,
        timeRange, timeRange, false, false, [], "obs", slotH, targetPerPerson
      );
      if (candidate) {
        const posStr = String(filledPerShift[timeRange] + 1);
        assignments.push({ userId: candidate.id, timeSlot: posStr, role: timeRange });
        if (!localAssignments[candidate.id]) localAssignments[candidate.id] = [];
        localAssignments[candidate.id].push({ role: timeRange, timeSlot: timeRange });
        if (!userBusy[candidate.id]) userBusy[candidate.id] = [];
        userBusy[candidate.id].push(timeRange);
        obsShiftCount[candidate.id] = (obsShiftCount[candidate.id] || 0) + 1;
        filledPerShift[timeRange]++;
      }
    }
  }

  // Pass 2: fill remaining slots allowing 2nd shift per person
  const totalNeeded = obsTimeRanges.length * obsPositions.length;
  if (assignments.length < totalNeeded) {
    for (const timeRange of shiftsByHours) {
      while (filledPerShift[timeRange] < obsPositions.length) {
        const slotH = parseTimeSlot(timeRange).hours;
        const candidate = findBestCandidate(
          users.filter(u => (obsShiftCount[u.id] || 0) < 2),
          hoursMap, debtMap, localAssignments, userBusy,
          timeRange, timeRange, false, false, [], "obs", slotH, targetPerPerson
        );
        if (!candidate) break;
        const posStr = String(filledPerShift[timeRange] + 1);
        assignments.push({ userId: candidate.id, timeSlot: posStr, role: timeRange });
        if (!localAssignments[candidate.id]) localAssignments[candidate.id] = [];
        localAssignments[candidate.id].push({ role: timeRange, timeSlot: timeRange });
        if (!userBusy[candidate.id]) userBusy[candidate.id] = [];
        userBusy[candidate.id].push(timeRange);
        obsShiftCount[candidate.id] = (obsShiftCount[candidate.id] || 0) + 1;
        filledPerShift[timeRange]++;
      }
    }
  }

  // Pass 3: still unfilled? allow 3rd shift
  if (assignments.length < totalNeeded) {
    for (const timeRange of shiftsByHours) {
      while (filledPerShift[timeRange] < obsPositions.length) {
        const slotH = parseTimeSlot(timeRange).hours;
        const candidate = findBestCandidate(
          users, hoursMap, debtMap, localAssignments, userBusy,
          timeRange, timeRange, false, false, [], "obs", slotH, targetPerPerson
        );
        if (!candidate) break;
        const posStr = String(filledPerShift[timeRange] + 1);
        assignments.push({ userId: candidate.id, timeSlot: posStr, role: timeRange });
        if (!localAssignments[candidate.id]) localAssignments[candidate.id] = [];
        localAssignments[candidate.id].push({ role: timeRange, timeSlot: timeRange });
        if (!userBusy[candidate.id]) userBusy[candidate.id] = [];
        userBusy[candidate.id].push(timeRange);
        obsShiftCount[candidate.id] = (obsShiftCount[candidate.id] || 0) + 1;
        filledPerShift[timeRange]++;
      }
    }
  }

  // ─── Post-assignment: swap optimization for obs fairness ───
  const computeWH = (): Record<string, number> => {
    const h: Record<string, number> = {};
    for (const a of assignments) {
      h[a.userId] = (h[a.userId] || 0) + weightedHours(a.role);
    }
    return h;
  };

  for (let swapRound = 0; swapRound < 30; swapRound++) {
    const userWH = computeWH();
    const entries = Object.entries(userWH).sort((a, b) => b[1] - a[1]);
    if (entries.length < 2) break;

    let improved = false;
    for (let hi = 0; hi < Math.min(5, entries.length) && !improved; hi++) {
      for (let lo = entries.length - 1; lo >= Math.max(entries.length - 5, hi + 1) && !improved; lo--) {
        const [highId, highWH] = entries[hi];
        const [lowId, lowWH] = entries[lo];
        if (highWH - lowWH < 1) continue;

        const highShifts = assignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === highId);
        const lowShifts = assignments.map((a, idx) => ({ ...a, idx })).filter(a => a.userId === lowId);

        for (const ha of highShifts) {
          const haWH = weightedHours(ha.role);
          for (const la of lowShifts) {
            const laWH = weightedHours(la.role);
            if (haWH <= laWH) continue;
            if (ha.role === la.role) continue; // same shift type, no point

            const newHighWH = highWH - haWH + laWH;
            const newLowWH = lowWH - laWH + haWH;
            if (Math.abs(newHighWH - newLowWH) >= Math.abs(highWH - lowWH)) continue;

            // Swap
            assignments[ha.idx] = { ...assignments[ha.idx], userId: lowId };
            assignments[la.idx] = { ...assignments[la.idx], userId: highId };
            improved = true;
            break;
          }
          if (improved) break;
        }
      }
    }
    if (!improved) break;
  }

  const usedUsers = new Set(assignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of assignments) {
    const h = parseTimeSlot(a.role).hours;
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return {
    title: 'עב"ס בהד"י',
    roles: obsTimeRanges,
    timeSlots: obsPositions,
    assignments,
    stats: { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) },
  };
}
