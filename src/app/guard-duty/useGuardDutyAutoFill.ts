"use client";

import type { GuardDutyState } from "./useGuardDutyState";

export function useGuardDutyAutoFill(
  state: GuardDutyState,
  fetchData: () => Promise<void>,
  t: Record<string, any>,
) {
  const {
    date, dayType,
    autoFillPreview, autoFillObsGdudi,
    setAutoFillPreview, setSubmitting,
  } = state;

  const handleAutoFill = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/guard-duty/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, types: dayType === "kitchen" ? ["kitchen"] : ["guard", "obs"] }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoFillPreview(data.tables);
        state.setAutoFillObsGdudi(data.obsGdudi || []);
      } else {
        const err = await res.json();
        alert(err.error || t.common.error);
      }
    } catch {
      alert(t.common.error);
    }
    setSubmitting(false);
  };

  const handleEditAutoFillAssignment = (tableType: string, slot: string, role: string, newUserId: string, oldUserId?: string) => {
    if (!autoFillPreview) return;
    setAutoFillPreview(prev => {
      if (!prev || !prev[tableType]) return prev;
      const tbl = { ...prev[tableType] };
      tbl.assignments = tbl.assignments.filter(a => {
        if (a.timeSlot !== slot || a.role !== role) return true;
        if (oldUserId) return a.userId !== oldUserId;
        return false;
      });
      if (newUserId) {
        tbl.assignments = [...tbl.assignments, { userId: newUserId, timeSlot: slot, role }];
      }
      return { ...prev, [tableType]: tbl };
    });
  };

  const handleApplyAutoFill = async () => {
    if (!autoFillPreview) return;
    setSubmitting(true);
    try {
      for (const [type, tbl] of Object.entries(autoFillPreview)) {
        const metadata = type === "guard" && autoFillObsGdudi.length > 0
          ? { obsGdudi: autoFillObsGdudi.map(g => g.name) }
          : undefined;
        await fetch("/api/guard-duty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date, type, title: tbl.title,
            roles: tbl.roles, timeSlots: tbl.timeSlots,
            assignments: tbl.assignments,
            metadata,
          }),
        });
      }
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

  return { handleAutoFill, handleEditAutoFillAssignment, handleApplyAutoFill };
}
