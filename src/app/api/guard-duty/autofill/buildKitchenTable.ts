import { KITCHEN_SHIFTS, KITCHEN_SHIFT_HOURS } from "./constants";
import type { EligibleUser, TableResult } from "./types";

export function buildKitchenTable(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
): TableResult {
  const assignments: { userId: string; timeSlot: string; role: string }[] = [];

  // Score users: lower = higher priority (less hours historically + less debt)
  const scored = users.map(u => ({
    user: u,
    score: (hoursMap[u.id] || 0) + (debtMap[u.id] || 0) * 2,
  }));
  scored.sort((a, b) => a.score - b.score);

  const perShift = Math.ceil(scored.length / 3);

  // Lowest score users (under-assigned) get longest shift (ערב 6h) to compensate
  const shiftOrder = ["16:00-22:00", "10:30-16:00", "06:00-10:30"]; // longest → shortest
  const reorderedShifts = shiftOrder.map((shift, i) => ({
    shift,
    users: scored.slice(i * perShift, (i + 1) * perShift).map(s => s.user),
  }));

  const maxPerShift = Math.max(...reorderedShifts.map(s => s.users.length));
  const timeSlots = Array.from({ length: maxPerShift }, (_, i) => String(i + 1));

  for (const { shift, users: shiftUsers } of reorderedShifts) {
    for (let i = 0; i < shiftUsers.length; i++) {
      assignments.push({
        userId: shiftUsers[i].id,
        timeSlot: String(i + 1),
        role: shift,
      });
    }
  }

  // Stats
  const usedUsers = new Set(assignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of assignments) {
    const h = KITCHEN_SHIFT_HOURS[a.role] || 0;
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return {
    title: "שיבוץ מטבח",
    roles: KITCHEN_SHIFTS,
    timeSlots,
    assignments,
    stats: { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) },
  };
}
