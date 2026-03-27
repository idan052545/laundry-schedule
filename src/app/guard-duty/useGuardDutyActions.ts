"use client";

import {
  DEFAULT_GUARD_ROLES, DEFAULT_GUARD_SLOTS,
  DEFAULT_OBS_ROLES, DEFAULT_OBS_SLOTS,
  KITCHEN_SHIFTS,
} from "./constants";
import type { GuardDutyState } from "./useGuardDutyState";

export function useGuardDutyActions(
  state: GuardDutyState,
  fetchData: () => Promise<void>,
  t: Record<string, any>,
) {
  const {
    date, tableType, table,
    swapping, swapUserId, appealing, appealReason, appealSuggestion,
    createTitle, createRoles, createSlots, createAssignments,
    setSwapping, setSwapUserId, setAppealing, setAppealReason, setAppealSuggestion,
    setSubmitting, setShowCreate,
    setCreateTitle, setCreateRoles, setCreateSlots, setCreateAssignments,
    setDayType, setTableType,
  } = state;

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
    const roles = tableType === "kitchen" ? [...KITCHEN_SHIFTS]
      : tableType === "guard" ? [...DEFAULT_GUARD_ROLES] : [...DEFAULT_OBS_ROLES];
    const slots = tableType === "kitchen" ? Array.from({ length: 20 }, (_, i) => String(i + 1))
      : tableType === "guard" ? [...DEFAULT_GUARD_SLOTS] : [...DEFAULT_OBS_SLOTS];
    setCreateRoles(roles);
    setCreateSlots(slots);
    setCreateTitle(
      tableType === "kitchen" ? t.guardDuty.kitchenTitle
      : tableType === "guard" ? t.guardDuty.guardDefaultTitle : t.guardDuty.obsDefaultTitle
    );
    setCreateAssignments({});
    setShowCreate(true);
  };

  const setAssignment = (slot: string, role: string, uId: string) => {
    setCreateAssignments((prev: Record<string, Record<string, string>>) => {
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

  const handleToggleDayType = async (newType: "duty" | "kitchen") => {
    setSubmitting(true);
    try {
      await fetch("/api/guard-duty/day-type", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, type: newType }),
      });
      setDayType(newType);
      setTableType(newType === "kitchen" ? "kitchen" : "guard");
      await fetchData();
    } catch {
      alert(t.common.error);
    }
    setSubmitting(false);
  };

  const handleRemoveAssignment = async () => {
    if (!swapping) return;
    if (!confirm(t.guardDuty.removeConfirm || "להסיר חייל זה מהשיבוץ?")) return;
    setSubmitting(true);
    const res = await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", assignmentId: swapping.id }),
    });
    if (res.ok) {
      setSwapping(null);
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || t.common.error);
    }
    setSubmitting(false);
  };

  return {
    handleSwap, handleAppeal, handleResolveAppeal,
    initCreateForm, setAssignment, handleCreate,
    handleDeleteTable, handleNotifyAll, handleToggleDayType,
    handleRemoveAssignment,
  };
}
