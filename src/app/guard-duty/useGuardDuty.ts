"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  DutyTable, UserMin, Appeal, Assignment, DAY_ROLES, Overlap,
  toDateStr, parseTimeRange,
  DEFAULT_GUARD_ROLES, DEFAULT_GUARD_SLOTS, DEFAULT_OBS_ROLES, DEFAULT_OBS_SLOTS,
} from "./constants";
import { useLanguage } from "@/i18n";

export function useGuardDuty() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { t, dateLocale } = useLanguage();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [date, setDate] = useState(toDateStr(new Date()));
  const [tableType, setTableType] = useState<"guard" | "obs">("guard");
  const [table, setTable] = useState<DutyTable | null>(null);
  const [allUsers, setAllUsers] = useState<UserMin[]>([]);
  const [isRoni, setIsRoni] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [initialDateSet, setInitialDateSet] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showPersonSummary, setShowPersonSummary] = useState<string | null>(null);
  const [showFairness, setShowFairness] = useState(false);
  const [showOverlaps, setShowOverlaps] = useState(false);
  const [otherTable, setOtherTable] = useState<DutyTable | null>(null);
  const [swapping, setSwapping] = useState<Assignment | null>(null);
  const [swapUserId, setSwapUserId] = useState("");
  const [appealing, setAppealing] = useState<Assignment | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealSuggestion, setAppealSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createTitle, setCreateTitle] = useState("");
  const [createRoles, setCreateRoles] = useState<string[]>([]);
  const [createSlots, setCreateSlots] = useState<string[]>([]);
  const [createAssignments, setCreateAssignments] = useState<Record<string, Record<string, string>>>({});

  // Auto-fill
  const [autoFillPreview, setAutoFillPreview] = useState<Record<string, {
    title: string; roles: string[]; timeSlots: string[];
    assignments: { userId: string; timeSlot: string; role: string }[];
    stats: { totalHours: number; usersUsed: number; fairnessScore: number };
  }> | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/guard-duty?date=${date}&type=${tableType}`);
    if (res.ok) {
      const data = await res.json();
      setTable(data.table);
      setAllUsers(data.allUsers);
      setIsRoni(data.isRoni);
      setIsCreator(data.isCreator || false);
      setAppeals(data.appeals);
      setHoursMap(data.hoursMap);
      if (data.availableDates) setAvailableDates(data.availableDates);

      const otherType = tableType === "guard" ? "obs" : "guard";
      fetch(`/api/guard-duty?date=${date}&type=${otherType}`).then(r => r.ok ? r.json() : null).then(d => {
        setOtherTable(d?.table || null);
      }).catch(() => setOtherTable(null));

      if (!initialDateSet && !data.table && data.availableDates?.length > 0) {
        const today = toDateStr(new Date());
        const sorted = [...data.availableDates].sort((a: string, b: string) =>
          Math.abs(new Date(a).getTime() - new Date(today).getTime()) -
          Math.abs(new Date(b).getTime() - new Date(today).getTime())
        );
        setInitialDateSet(true);
        setDate(sorted[0]);
        return;
      }
      setInitialDateSet(true);
    }
    setLoading(false);
  }, [date, tableType, initialDateSet]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") fetchData();
  }, [authStatus, router, fetchData]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toDateStr(d));
  };

  const handleSwap = async () => {
    if (!swapping || !swapUserId) return;
    setSubmitting(true);
    const res = await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "swap", assignmentId: swapping.id, newUserId: swapUserId }),
    });
    if (res.ok) {
      setSwapping(null); setSwapUserId("");
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || t.common.error);
    }
    setSubmitting(false);
  };

  const handleAppeal = async () => {
    if (!appealing) return;
    setSubmitting(true);
    await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "appeal",
        assignmentId: appealing.id,
        reason: appealReason,
        suggestedUserId: appealSuggestion || null,
      }),
    });
    setAppealing(null); setAppealReason(""); setAppealSuggestion("");
    setSubmitting(false);
    await fetchData();
  };

  const handleResolveAppeal = async (appealId: string, approved: boolean) => {
    setSubmitting(true);
    const res = await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-appeal", appealId, approved }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || t.common.error);
    }
    setSubmitting(false);
    await fetchData();
  };

  const initCreateForm = () => {
    const roles = tableType === "guard" ? [...DEFAULT_GUARD_ROLES] : [...DEFAULT_OBS_ROLES];
    const slots = tableType === "guard" ? [...DEFAULT_GUARD_SLOTS] : [...DEFAULT_OBS_SLOTS];
    setCreateRoles(roles);
    setCreateSlots(slots);
    setCreateTitle(tableType === "guard" ? t.guardDuty.guardDefaultTitle : t.guardDuty.obsDefaultTitle);
    setCreateAssignments({});
    setShowCreate(true);
  };

  const setAssignment = (slot: string, role: string, uId: string) => {
    setCreateAssignments(prev => {
      const next = { ...prev };
      if (!next[slot]) next[slot] = {};
      next[slot] = { ...next[slot], [role]: uId };
      return next;
    });
  };

  const handleCreate = async () => {
    setSubmitting(true);
    const assignments: { userId: string; timeSlot: string; role: string }[] = [];
    for (const slot of createSlots) {
      for (const role of createRoles) {
        const uid = createAssignments[slot]?.[role];
        if (uid) assignments.push({ userId: uid, timeSlot: slot, role });
      }
    }
    const res = await fetch("/api/guard-duty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date, type: tableType, title: createTitle,
        roles: createRoles, timeSlots: createSlots, assignments,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      await fetchData();
    }
    setSubmitting(false);
  };

  // Auto-fill: generate optimized assignments
  const handleAutoFill = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/guard-duty/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, types: ["guard", "obs"] }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoFillPreview(data.tables);
      } else {
        const err = await res.json();
        alert(err.error || t.common.error);
      }
    } catch {
      alert(t.common.error);
    }
    setSubmitting(false);
  };

  // Edit a single assignment in the auto-fill preview (before saving)
  const handleEditAutoFillAssignment = (tableType: string, slot: string, role: string, newUserId: string, oldUserId?: string) => {
    if (!autoFillPreview) return;
    setAutoFillPreview(prev => {
      if (!prev || !prev[tableType]) return prev;
      const tbl = { ...prev[tableType] };
      // Remove old assignment for this slot+role (and optionally specific user)
      tbl.assignments = tbl.assignments.filter(a => {
        if (a.timeSlot !== slot || a.role !== role) return true;
        if (oldUserId) return a.userId !== oldUserId;
        return false; // remove all for this cell
      });
      // Add new if userId provided
      if (newUserId) {
        tbl.assignments = [...tbl.assignments, { userId: newUserId, timeSlot: slot, role }];
      }
      return { ...prev, [tableType]: tbl };
    });
  };

  // Apply auto-fill: save both tables
  const handleApplyAutoFill = async () => {
    if (!autoFillPreview) return;
    setSubmitting(true);
    try {
      for (const [type, tbl] of Object.entries(autoFillPreview)) {
        await fetch("/api/guard-duty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date, type, title: tbl.title,
            roles: tbl.roles, timeSlots: tbl.timeSlots,
            assignments: tbl.assignments,
          }),
        });
      }
      // Record fairness debt (טבלת צדק) so next autofill prioritizes under-assigned users
      await fetch("/api/guard-duty/fairness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, tables: autoFillPreview }),
      });
      setAutoFillPreview(null);
      await fetchData();
    } catch {
      alert(t.common.error);
    }
    setSubmitting(false);
  };

  // Export all tables for current date (both guard + obs in one file)
  const handleExportAllXlsx = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Fetch both tables
    for (const tp of ["guard", "obs"] as const) {
      const res = await fetch(`/api/guard-duty?date=${date}&type=${tp}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.table) continue;

      const tbl = data.table;
      const roles: string[] = JSON.parse(tbl.roles);
      const slots: string[] = JSON.parse(tbl.timeSlots);

      const header = [t.guardDuty.shift, ...roles];
      const rows = slots.map((slot: string) => {
        const row: Record<string, string> = { [t.guardDuty.shift]: slot };
        roles.forEach(role => {
          const found = tbl.assignments.filter((a: { timeSlot: string; role: string; note?: string; user: { name: string } }) => a.timeSlot === slot && a.role === role);
          row[role] = found.map((a: { note?: string; user: { name: string } }) => a.note ? `${a.note} ${a.user.name}` : a.user.name).join(", ");
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header });
      ws["!cols"] = header.map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, ws, tbl.title);
    }

    if (wb.SheetNames.length > 0) {
      XLSX.writeFile(wb, `תורנויות_${date}.xlsx`);
    }
  };

  const handleExportXlsx = async () => {
    if (!table) return;
    const XLSX = await import("xlsx");
    const roles: string[] = JSON.parse(table.roles);
    const slots: string[] = JSON.parse(table.timeSlots);

    const header = [t.guardDuty.shift, ...roles];
    const rows = slots.map(slot => {
      const row: Record<string, string> = { [t.guardDuty.shift]: slot };
      roles.forEach(role => {
        const found = table.assignments.filter(a => a.timeSlot === slot && a.role === role);
        row[role] = found.map(a => a.note ? `${a.note} ${a.user.name}` : a.user.name).join(", ");
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header });
    ws["!cols"] = header.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table.title);
    XLSX.writeFile(wb, `${table.title}_${table.date}.xlsx`);
  };

  const handleDeleteTable = async () => {
    if (!table || !confirm(t.guardDuty.deleteTableConfirm)) return;
    await fetch(`/api/guard-duty?id=${table.id}`, { method: "DELETE" });
    await fetchData();
  };

  const handleNotifyAll = async () => {
    if (!table || !confirm(t.guardDuty.notifyAllConfirm)) return;
    setSubmitting(true);
    const res = await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notify-all", tableId: table.id }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(t.guardDuty.notifiedCount.replace("{n}", data.notified));
    } else {
      alert(data.error || t.guardDuty.sendError);
    }
    setSubmitting(false);
  };

  // Derived data
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

  const obsGdudi: string[] = (() => {
    if (!table?.metadata) return [];
    try {
      const meta = JSON.parse(table.metadata);
      return meta.obsGdudi || [];
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
    // Auth
    authStatus, userId,
    // Data
    table, allUsers, isRoni, isCreator, appeals, hoursMap, availableDates,
    roles, slots, dayRoleAssignments, squads, obsGdudi, overlaps,
    fairnessData, avgHours, assignedPeople, myAssignments,
    // UI state
    date, tableType, setTableType, loading,
    showCreate, setShowCreate, showPersonSummary, setShowPersonSummary,
    showFairness, setShowFairness, showOverlaps, setShowOverlaps,
    swapping, setSwapping, swapUserId, setSwapUserId,
    appealing, setAppealing, appealReason, setAppealReason,
    appealSuggestion, setAppealSuggestion, submitting,
    showCalendar, setShowCalendar,
    // Create form
    createTitle, setCreateTitle, createRoles, createSlots, createAssignments,
    // Auto-fill
    autoFillPreview, setAutoFillPreview,
    // Actions
    changeDate, handleSwap, handleAppeal, handleResolveAppeal,
    initCreateForm, setAssignment, handleCreate,
    handleExportXlsx, handleExportAllXlsx, handleDeleteTable, handleNotifyAll,
    handleAutoFill, handleApplyAutoFill, handleEditAutoFillAssignment,
    // Helpers
    dateDisplay, getPersonAssignments, getPersonHours, otherTable, setDate, fetchData,
  };
}
