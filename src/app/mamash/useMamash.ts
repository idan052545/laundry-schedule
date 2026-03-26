"use client";

import { useState, useEffect, useCallback } from "react";
import type { MamashOverview, Requirement, BaltamAction } from "./types";
import { getWeekStart } from "./constants";

export function useMamash(date: string, team: number | null) {
  const [data, setData] = useState<MamashOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mamash/overview?date=${date}&team=${team}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || "שגיאה בטעינה");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, [date, team]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // ── Role actions ──
  const activateRole = useCallback(async () => {
    if (!team) return;
    setActing(true);
    try {
      const res = await fetch("/api/mamash/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      if (res.ok) await fetchOverview();
    } finally {
      setActing(false);
    }
  }, [team, fetchOverview]);

  const deactivateRole = useCallback(async () => {
    if (!team) return;
    setActing(true);
    try {
      await fetch(`/api/mamash/role?team=${team}`, { method: "DELETE" });
      await fetchOverview();
    } finally {
      setActing(false);
    }
  }, [team, fetchOverview]);

  // ── Requirements CRUD ──
  const addRequirement = useCallback(async (req: {
    type: string; title: string; description?: string;
    targetUserId?: string; duration?: number; priority?: string;
  }) => {
    if (!team) return null;
    setActing(true);
    try {
      const weekStart = getWeekStart(new Date(date));
      const res = await fetch("/api/mamash/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, team, weekStart }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      setData(prev => prev ? { ...prev, requirements: [...prev.requirements, json.requirement] } : prev);
      return json.requirement as Requirement;
    } finally {
      setActing(false);
    }
  }, [team, date]);

  const updateRequirement = useCallback(async (id: string, updates: Partial<Requirement>) => {
    setActing(true);
    try {
      const res = await fetch("/api/mamash/requirements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(prev => prev ? {
        ...prev,
        requirements: prev.requirements.map(r => r.id === id ? json.requirement : r),
      } : prev);
    } finally {
      setActing(false);
    }
  }, []);

  const deleteRequirement = useCallback(async (id: string) => {
    setActing(true);
    try {
      await fetch(`/api/mamash/requirements?id=${id}`, { method: "DELETE" });
      setData(prev => prev ? {
        ...prev,
        requirements: prev.requirements.filter(r => r.id !== id),
      } : prev);
    } finally {
      setActing(false);
    }
  }, []);

  // ── Baltam actions ──
  const doBaltam = useCallback(async (
    action: BaltamAction,
    payload: Record<string, unknown>
  ): Promise<{ ok: boolean; cascadeConflicts?: unknown[] }> => {
    if (!team) return { ok: false };
    setActing(true);
    try {
      const res = await fetch("/api/mamash/baltam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, team, ...payload }),
      });
      const json = await res.json();
      if (res.status === 409) return { ok: false, cascadeConflicts: json.cascadeConflicts };
      if (!res.ok) return { ok: false };
      await fetchOverview();
      return { ok: true };
    } finally {
      setActing(false);
    }
  }, [team, fetchOverview]);

  // ── Calendar write ──
  const pushToCalendar = useCallback(async (event: {
    title: string; description?: string; startTime: string; endTime: string; allDay?: boolean;
  }): Promise<{ ok: boolean; error?: string; needsSetup?: boolean }> => {
    if (!team) return { ok: false, error: "No team" };
    setActing(true);
    try {
      const res = await fetch("/api/mamash/calendar-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, ...event }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error, needsSetup: json.needsSetup };
      return { ok: true };
    } finally {
      setActing(false);
    }
  }, [team]);

  return {
    data, loading, error, acting,
    fetchOverview,
    activateRole, deactivateRole,
    addRequirement, updateRequirement, deleteRequirement,
    doBaltam,
    pushToCalendar,
  };
}
