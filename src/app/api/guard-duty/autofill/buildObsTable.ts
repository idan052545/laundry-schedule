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

  const assignments: { userId: string; timeSlot: string; role: string }[] = [];
  const localAssignments: Record<string, { role: string; timeSlot: string }[]> = {};
  // Track how many obs shifts each person has
  const obsShiftCount: Record<string, number> = {};

  // Pass 1: assign each person to at most 1 obs shift
  for (const timeRange of obsTimeRanges) {
    for (const pos of obsPositions) {
      const candidate = findBestCandidate(
        users.filter(u => (obsShiftCount[u.id] || 0) < 1),
        hoursMap, debtMap, localAssignments, userBusy, timeRange, timeRange, false, false, [], "obs"
      );
      if (candidate) {
        assignments.push({ userId: candidate.id, timeSlot: pos, role: timeRange });
        if (!localAssignments[candidate.id]) localAssignments[candidate.id] = [];
        localAssignments[candidate.id].push({ role: timeRange, timeSlot: timeRange });

        if (!userBusy[candidate.id]) userBusy[candidate.id] = [];
        userBusy[candidate.id].push(timeRange);
        obsShiftCount[candidate.id] = (obsShiftCount[candidate.id] || 0) + 1;
      }
    }
  }

  // Pass 2: if there are still unfilled slots (? marks), allow a 2nd shift
  const totalNeeded = obsTimeRanges.length * obsPositions.length;
  if (assignments.length < totalNeeded) {
    // Rebuild what's missing per shift
    const filledPerShift: Record<string, number> = {};
    for (const a of assignments) filledPerShift[a.role] = (filledPerShift[a.role] || 0) + 1;

    for (const timeRange of obsTimeRanges) {
      const filled = filledPerShift[timeRange] || 0;
      const needed = obsPositions.length - filled;
      for (let i = 0; i < needed; i++) {
        const pos = String(filled + i + 1);
        const candidate = findBestCandidate(
          users.filter(u => (obsShiftCount[u.id] || 0) < 2),
          hoursMap, debtMap, localAssignments, userBusy, timeRange, timeRange, false, false, [], "obs"
        );
        if (candidate) {
          assignments.push({ userId: candidate.id, timeSlot: pos, role: timeRange });
          if (!localAssignments[candidate.id]) localAssignments[candidate.id] = [];
          localAssignments[candidate.id].push({ role: timeRange, timeSlot: timeRange });

          if (!userBusy[candidate.id]) userBusy[candidate.id] = [];
          userBusy[candidate.id].push(timeRange);
          obsShiftCount[candidate.id] = (obsShiftCount[candidate.id] || 0) + 1;
        }
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
