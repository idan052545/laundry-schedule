"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ScheduleEvent, UserOption, EventFormData } from "./types";
import { toISO, getDurationMin } from "./utils";

export function useScheduleEvents(status: string, date: string, typeFilter: string) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userTeam, setUserTeam] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncDiff, setSyncDiff] = useState<{ added: string[]; removed: string[]; updated: string[]; unchanged: boolean } | null>(null);
  const [teamSyncing, setTeamSyncing] = useState(false);
  const [teamSyncDiff, setTeamSyncDiff] = useState<{ added: string[]; removed: string[]; updated: string[]; unchanged: boolean } | null>(null);
  const [teamSyncTarget, setTeamSyncTarget] = useState<number | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assignTeamFilter, setAssignTeamFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [formUserIds, setFormUserIds] = useState<string[]>([]);
  const [visibleTeams, setVisibleTeams] = useState<Set<number>>(() => new Set());

  const initialLoadDone = useRef(false);
  const visibleTeamsRef = useRef(visibleTeams);
  visibleTeamsRef.current = visibleTeams;
  const usersLoaded = useRef(false);

  const fetchEvents = useCallback(async () => {
    if (initialLoadDone.current) setRefreshing(true);
    let url = `/api/schedule?date=${date}&type=${typeFilter}`;
    const vt = visibleTeamsRef.current;
    if (vt.size > 0) {
      url += `&teams=${Array.from(vt).join(",")}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setIsAdmin(data.isAdmin);
      if (data.userTeam !== undefined) {
        setUserTeam(data.userTeam);
        if (!initialLoadDone.current && data.userTeam) {
          setVisibleTeams(prev => prev.size === 0 ? new Set([data.userTeam]) : prev);
        }
      }
    }
    setLoading(false);
    setRefreshing(false);
    initialLoadDone.current = true;
  }, [date, typeFilter]);

  const loadUsers = useCallback(() => {
    if (!usersLoaded.current) {
      usersLoaded.current = true;
      fetch("/api/users-wall").then(res => res.ok ? res.json() : []).then(data => {
        setAllUsers(data.map((u: UserOption) => ({ id: u.id, name: u.name, image: u.image, team: u.team })));
      });
    }
  }, []);

  const SYNC_TEAMS = [14, 15, 16, 17] as const;

  const toggleTeamVisibility = (team: number) => {
    setVisibleTeams(prev => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team); else next.add(team);
      return next;
    });
  };

  const assignUsersToEvent = async (eventId: string, userIds: string[]) => {
    if (userIds.length === 0) return null;
    const res = await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId, action: "assign", assigneeIds: userIds }),
    });
    if (res.ok) return await res.json();
    return null;
  };

  const handleAdd = async (e: React.FormEvent, form: EventFormData, resetForm: () => void, setShowAdd: (v: boolean) => void) => {
    e.preventDefault();
    const startTime = form.allDay ? new Date(`${date}T00:00:00`).toISOString() : toISO(date, form.startTime);
    const endTime = form.allDay ? new Date(`${date}T23:59:59`).toISOString() : toISO(date, form.endTime);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, startTime, endTime }),
    });
    if (res.ok) {
      let event = await res.json();
      if (formUserIds.length > 0) {
        const updated = await assignUsersToEvent(event.id, formUserIds);
        if (updated) event = updated;
      }
      setEvents((prev) => [...prev, event].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      setShowAdd(false);
      resetForm();
    }
  };

  const handleEdit = async (e: React.FormEvent, form: EventFormData, editingEvent: ScheduleEvent, onDone: () => void) => {
    e.preventDefault();
    const startTime = form.allDay ? new Date(`${date}T00:00:00`).toISOString() : toISO(date, form.startTime);
    const endTime = form.allDay ? new Date(`${date}T23:59:59`).toISOString() : toISO(date, form.endTime);
    const res = await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingEvent.id, ...form, startTime, endTime }),
    });
    if (res.ok) {
      let updated = await res.json();
      const assigned = await assignUsersToEvent(editingEvent.id, formUserIds);
      if (assigned) updated = assigned;
      setEvents((prev) => prev.map((ev) => ev.id === updated.id ? updated : ev)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      onDone();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק אירוע זה?")) return;
    const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  const handleSync = async () => {
    if (!confirm("לסנכרן את הלוז מיומן Google? כל האירועים הקיימים יוחלפו.")) return;
    setSyncing(true);
    setSyncDiff(null);
    try {
      const res = await fetch("/api/schedule/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.todayDiff) setSyncDiff(data.todayDiff);
        await fetchEvents();
      } else {
        alert(data.error || "שגיאה בסנכרון");
      }
    } catch {
      alert("שגיאה בסנכרון");
    }
    setSyncing(false);
  };

  const handleNotifyChanges = async () => {
    if (!syncDiff || syncDiff.unchanged) return;
    setSyncing(true);
    const lines: string[] = [];
    if (syncDiff.updated.length > 0) { lines.push("עודכנו:"); syncDiff.updated.forEach(t => lines.push(`  ✏️ ${t}`)); }
    if (syncDiff.added.length > 0) { lines.push("נוספו:"); syncDiff.added.forEach(t => lines.push(`  ➕ ${t}`)); }
    if (syncDiff.removed.length > 0) { lines.push("הוסרו:"); syncDiff.removed.forEach(t => lines.push(`  ➖ ${t}`)); }
    const body = lines.join("\n");
    try {
      await fetch("/api/schedule/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: body }),
      });
      alert("נשלחה התראה לכולם");
    } catch {
      alert("שגיאה בשליחה");
    }
    setSyncing(false);
  };

  const handleTeamSync = async (team?: number) => {
    const t = team || userTeam;
    if (!t) return;
    if (!confirm(`לסנכרן את הלוז מיומן צוות ${t}? אירועי הצוות הקיימים יוחלפו.`)) return;
    setTeamSyncing(true);
    setTeamSyncDiff(null);
    setTeamSyncTarget(t);
    try {
      const res = await fetch(`/api/schedule/sync-team?team=${t}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.todayDiff) setTeamSyncDiff(data.todayDiff);
        await fetchEvents();
      } else {
        alert(data.error || "שגיאה בסנכרון");
      }
    } catch {
      alert("שגיאה בסנכרון");
    }
    setTeamSyncing(false);
  };

  const handleTeamNotifyChanges = async () => {
    if (!teamSyncDiff || teamSyncDiff.unchanged) return;
    const t = teamSyncTarget || userTeam;
    setTeamSyncing(true);
    const lines: string[] = [];
    if (teamSyncDiff.updated.length > 0) { lines.push("עודכנו:"); teamSyncDiff.updated.forEach(t => lines.push(`  ✏️ ${t}`)); }
    if (teamSyncDiff.added.length > 0) { lines.push("נוספו:"); teamSyncDiff.added.forEach(t => lines.push(`  ➕ ${t}`)); }
    if (teamSyncDiff.removed.length > 0) { lines.push("הוסרו:"); teamSyncDiff.removed.forEach(t => lines.push(`  ➖ ${t}`)); }
    const body = lines.join("\n");
    try {
      await fetch(`/api/schedule/sync-team?team=${t}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: body }),
      });
      alert(`נשלחה התראה לצוות ${t}`);
    } catch {
      alert("שגיאה בשליחה");
    }
    setTeamSyncing(false);
  };

  const handleTeamRemind = async (team?: number) => {
    const t = team || userTeam;
    if (!t) return;
    const teamEvents = events.filter(e => e.target === `team-${t}`);
    if (teamEvents.length === 0) { alert(`אין אירועי צוות ${t} להיום`); return; }
    const summary = teamEvents.map(e => {
      if (e.allDay) return `${e.title} (כל היום)`;
      const st = new Date(e.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      const en = new Date(e.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      return `${e.title} (${st}–${en})`;
    }).join(" | ");
    setTeamSyncing(true);
    try {
      await fetch(`/api/schedule/sync-team?team=${t}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: summary }),
      });
      alert(`נשלחה תזכורת לצוות ${t}`);
    } catch {
      alert("שגיאה בשליחה");
    }
    setTeamSyncing(false);
  };

  const handleRemind = async (id: string) => {
    setReminding(id);
    await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "remind" }),
    });
    setReminding(null);
  };

  const handleRemindAssigned = async (id: string) => {
    setReminding(id);
    await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "remind-assigned" }),
    });
    setReminding(null);
  };

  const openAssign = (event: ScheduleEvent) => {
    setShowAssign(event.id);
    setSelectedUserIds(event.assignees.map((a) => a.userId));
    setUserSearch("");
    setAssignTeamFilter("all");
  };

  const handleAssign = async () => {
    if (!showAssign) return;
    const res = await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: showAssign, action: "assign", assigneeIds: selectedUserIds }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvents((prev) => prev.map((ev) => ev.id === updated.id ? updated : ev));
    }
    setShowAssign(null);
  };

  const moveEvent = async (eventIdx: number, direction: "up" | "down", timedEvents: ScheduleEvent[]) => {
    const targetIdx = direction === "up" ? eventIdx - 1 : eventIdx + 1;
    if (targetIdx < 0 || targetIdx >= timedEvents.length) return;

    const eventA = timedEvents[eventIdx];
    const eventB = timedEvents[targetIdx];

    const earlierIdx = Math.min(eventIdx, targetIdx);
    const laterIdx = Math.max(eventIdx, targetIdx);
    const earlierEvent = timedEvents[earlierIdx];
    const laterEvent = timedEvents[laterIdx];

    const earlierStart = new Date(earlierEvent.startTime);
    const laterStart = new Date(laterEvent.startTime);

    const movingUp = direction === "up" ? eventA : eventB;
    const movingDown = direction === "up" ? eventB : eventA;

    const newUpStart = earlierStart;
    const newUpEnd = new Date(newUpStart.getTime() + getDurationMin(movingUp) * 60000);

    const newDownStart = newUpEnd.getTime() > laterStart.getTime() ? newUpEnd : laterStart;
    const newDownEnd = new Date(newDownStart.getTime() + getDurationMin(movingDown) * 60000);

    const updates = [
      { id: movingUp.id, startTime: newUpStart.toISOString(), endTime: newUpEnd.toISOString() },
      { id: movingDown.id, startTime: newDownStart.toISOString(), endTime: newDownEnd.toISOString() },
    ];

    setEvents((prev) => {
      const updated = prev.map((ev) => {
        const u = updates.find((upd) => upd.id === ev.id);
        if (u) return { ...ev, startTime: u.startTime, endTime: u.endTime };
        return ev;
      });
      return updated.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    });

    for (const u of updates) {
      await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u),
      });
    }
  };

  return {
    events, isAdmin, userTeam, loading, refreshing,
    allUsers, syncing, syncDiff, setSyncDiff,
    teamSyncing, teamSyncDiff, setTeamSyncDiff, teamSyncTarget,
    reminding, showAssign, setShowAssign, selectedUserIds, setSelectedUserIds,
    assignTeamFilter, setAssignTeamFilter, userSearch, setUserSearch,
    formUserIds, setFormUserIds,
    visibleTeams, setVisibleTeams, SYNC_TEAMS,
    initialLoadDone,
    fetchEvents, loadUsers, toggleTeamVisibility,
    handleAdd, handleEdit, handleDelete,
    handleSync, handleNotifyChanges,
    handleTeamSync, handleTeamNotifyChanges, handleTeamRemind,
    handleRemind, handleRemindAssigned,
    openAssign, handleAssign, moveEvent,
  };
}
