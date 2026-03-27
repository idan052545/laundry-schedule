"use client";

import { Assignment, DAY_ROLES, Overlap, parseTimeRange } from "./constants";
import type { GuardDutyState } from "./useGuardDutyState";

export function useGuardDutyDerived(
  state: GuardDutyState,
  userId: string | null,
  t: Record<string, any>,
  dateLocale: string,
) {
  const { date, table, tableType, otherTable, allUsers, hoursMap } = state;

  const allRoles: string[] = table ? JSON.parse(table.roles) : [];
  const slots: string[] = table ? JSON.parse(table.timeSlots) : [];
  const roles = allRoles.filter(r => !DAY_ROLES.includes(r));

  const dayRoleAssignments = table ? DAY_ROLES.map(role => ({
    role,
    people: [...new Map(
      table.assignments
        .filter(a => a.role === role)
        .map(a => [a.userId, a] as const)
    ).values()],
  })).filter(r => r.people.length > 0) : [];

  const squads: { number: number; members: string[] }[] = (() => {
    if (!table?.metadata) return [];
    try {
      const meta = JSON.parse(table.metadata);
      return meta.squads || [];
    } catch { return []; }
  })();

  const obsGdudi: { name: string; team?: number; obsShift?: string }[] = (() => {
    if (!table?.metadata) return [];
    try {
      const meta = JSON.parse(table.metadata);
      if (!meta.obsGdudi) return [];
      // Handle both old format (string[]) and new format (object[])
      return meta.obsGdudi.map((entry: string | { name: string; team?: number; obsShift?: string }) =>
        typeof entry === "string" ? { name: entry } : entry
      );
    } catch { return []; }
  })();

  // Overlap detection
  const overlaps: Overlap[] = (() => {
    const result: Overlap[] = [];
    if (!table) return result;

    const toMin = (t: string) => { const p = t.split(":").map(Number); return p.length === 2 && !p.some(isNaN) ? p[0] * 60 + p[1] : -1; };
    const getRange = (a: Assignment): [number, number] | null => {
      for (const src of [a.note, a.timeSlot, a.role]) {
        if (!src) continue;
        const parts = src.split("-");
        if (parts.length === 2) {
          const s = toMin(parts[0]), e = toMin(parts[1]);
          if (s >= 0 && e >= 0) return [s, e < s ? e + 1440 : e];
        }
      }
      return null;
    };
    const rangesOverlap = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

    const byPersonSlot = new Map<string, Assignment[]>();
    for (const a of table.assignments) {
      if (DAY_ROLES.includes(a.role)) continue;
      const key = `${a.userId}__${a.timeSlot}`;
      if (!byPersonSlot.has(key)) byPersonSlot.set(key, []);
      byPersonSlot.get(key)!.push(a);
    }
    for (const [, assignments] of byPersonSlot) {
      if (assignments.length > 1) {
        const a = assignments[0];
        result.push({
          type: "same-slot",
          userId: a.userId,
          userName: a.user.name,
          details: `${a.timeSlot}: ${assignments.map(x => x.role).join(" + ")}`,
        });
      }
    }

    const byPerson = new Map<string, Assignment[]>();
    for (const a of table.assignments) {
      if (DAY_ROLES.includes(a.role)) continue;
      if (!byPerson.has(a.userId)) byPerson.set(a.userId, []);
      byPerson.get(a.userId)!.push(a);
    }
    for (const [uid, assignments] of byPerson) {
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const ai = assignments[i], aj = assignments[j];
          if (ai.timeSlot === aj.timeSlot) continue;
          const ri = getRange(ai), rj = getRange(aj);
          if (ri && rj && rangesOverlap(ri, rj)) {
            result.push({
              type: "same-slot",
              userId: uid,
              userName: ai.user.name,
              details: `${t.guardDuty.timeOverlap} ${ai.role} (${ai.note || ai.timeSlot}) ↔ ${aj.role} (${aj.note || aj.timeSlot})`,
            });
          }
        }
      }
    }

    if (otherTable) {
      const otherName = tableType === "guard" ? t.guardDuty.avs : t.guardDuty.guards;
      const currentName = tableType === "guard" ? t.guardDuty.guards : t.guardDuty.avs;
      for (const a of table.assignments) {
        if (DAY_ROLES.includes(a.role)) continue;
        const ra = getRange(a);
        if (!ra) continue;
        for (const b of otherTable.assignments) {
          if (b.userId !== a.userId) continue;
          if (DAY_ROLES.includes(b.role)) continue;
          const rb = getRange(b);
          if (rb && rangesOverlap(ra, rb)) {
            const dupKey = `${a.userId}-${a.timeSlot}-${b.timeSlot}`;
            if (!result.some(r => r.type === "cross-table" && r.details.includes(dupKey))) {
              result.push({
                type: "cross-table",
                userId: a.userId,
                userName: a.user.name,
                details: `${currentName} ${a.role} (${a.note || a.timeSlot}) ↔ ${otherName} (${b.note || b.role || b.timeSlot}) [${dupKey}]`,
              });
            }
          }
        }
      }
    }

    return result;
  })();

  const getPersonAssignments = (personId: string) =>
    table?.assignments.filter(a => a.userId === personId) || [];

  const getPersonHours = (personId: string) => {
    let total = 0;
    for (const a of getPersonAssignments(personId)) {
      if (DAY_ROLES.includes(a.role)) continue;
      const fromSlot = parseTimeRange(a.timeSlot);
      const fromRole = parseTimeRange(a.role);
      total += fromSlot > 0 ? fromSlot : fromRole;
    }
    return total;
  };

  const fairnessData = allUsers
    .map(u => ({ ...u, hours: hoursMap[u.id] || 0 }))
    .filter(u => u.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  const avgHours = fairnessData.length > 0 ? fairnessData.reduce((s, u) => s + u.hours, 0) / fairnessData.length : 0;

  const dateDisplay = new Date(date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });

  const assignedPeople = table ? [...new Map(table.assignments.map(a => [a.userId, a.user])).values()] : [];

  const myAssignments = table?.assignments.filter(a => a.userId === userId) || [];

  return {
    roles, slots, dayRoleAssignments, squads, obsGdudi, overlaps,
    fairnessData, avgHours, assignedPeople, myAssignments,
    dateDisplay, getPersonAssignments, getPersonHours,
  };
}
