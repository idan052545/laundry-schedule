import { findBestCandidate, parseTimeSlot } from "./helpers";
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

  const assignments: { userId: string; timeSlot: string; role: string }[] = [];
  const localAssignments: Record<string, { role: string; timeSlot: string }[]> = {};
  const obsShiftCount: Record<string, number> = {};
  const filledPerShift: Record<string, number> = {};
  for (const s of obsTimeRanges) filledPerShift[s] = 0;

  // Pass 1: round-robin across shifts, 1 person per shift max
  // Fill 1 slot from each shift in rotation until all 20 per shift are filled
  for (let pos = 0; pos < obsPositions.length; pos++) {
    for (const timeRange of shiftsByHours) {
      if (filledPerShift[timeRange] >= obsPositions.length) continue;
      const slotH = parseTimeSlot(timeRange).hours;
      const candidate = findBestCandidate(
        users.filter(u => (obsShiftCount[u.id] || 0) < 1),
        hoursMap, debtMap, localAssignments, userBusy,
        timeRange, timeRange, false, false, [], "obs", slotH
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
          timeRange, timeRange, false, false, [], "obs", slotH
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
          timeRange, timeRange, false, false, [], "obs", slotH
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
