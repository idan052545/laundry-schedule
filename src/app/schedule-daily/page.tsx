"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdCalendarMonth, MdChevronRight, MdChevronLeft, MdAdd,
  MdEdit, MdDelete, MdFilterList, MdToday, MdNotifications,
  MdStickyNote2, MdClose, MdPeople, MdPerson,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { TYPE_CONFIG } from "./constants";
import { ScheduleEvent, UserOption, EventFormData, ScheduleNote } from "./types";
import { formatTime, formatDateDisplay, toISO, getDurationMin, isEventNow, groupTimedEvents } from "./utils";
import EventForm from "./EventForm";
import EventCard from "./EventCard";
import EventDetailModal from "./EventDetailModal";
import AssignModal from "./AssignModal";

export default function ScheduleDailyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assignTeamFilter, setAssignTeamFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [reminding, setReminding] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<ScheduleEvent | null>(null);
  const [formUserIds, setFormUserIds] = useState<string[]>([]);

  // Notes state
  const [notes, setNotes] = useState<ScheduleNote[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<ScheduleNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", description: "", startTime: "", endTime: "", visibility: "personal" });
  const [noteReminding, setNoteReminding] = useState<string | null>(null);

  const [form, setForm] = useState<EventFormData>({
    title: "", description: "", startTime: "", endTime: "",
    allDay: false, target: "all", type: "general",
  });

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`/api/schedule?date=${date}&type=${typeFilter}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }, [date, typeFilter]);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/schedule/notes?date=${date}`);
    if (res.ok) setNotes(await res.json());
  }, [date]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users-wall");
    if (res.ok) {
      const data = await res.json();
      setAllUsers(data.map((u: UserOption) => ({ id: u.id, name: u.name, image: u.image, team: u.team })));
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetchEvents();
      fetchUsers();
      fetchNotes();
    }
  }, [status, router, fetchEvents, fetchUsers, fetchNotes]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEvents();
      fetchNotes();
    }
  }, [date, typeFilter, status, fetchEvents, fetchNotes]);

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);
  const timedGroups = groupTimedEvents(timedEvents);

  const isToday = date === new Date().toISOString().split("T")[0];

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const resetForm = () => {
    setForm({ title: "", description: "", startTime: "", endTime: "", allDay: false, target: "all", type: "general" });
    setFormUserIds([]);
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

  const handleAdd = async (e: React.FormEvent) => {
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
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
      setEditingEvent(null);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק אירוע זה?")) return;
    const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((ev) => ev.id !== id));
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

  const openEdit = (event: ScheduleEvent) => {
    setShowAdd(false);
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    setForm({
      title: event.title,
      description: event.description || "",
      startTime: start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }),
      endTime: end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }),
      allDay: event.allDay,
      target: event.target,
      type: event.type,
    });
    setFormUserIds(event.assignees.map((a) => a.userId));
    setEditingEvent(event);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const moveEvent = async (eventIdx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? eventIdx - 1 : eventIdx + 1;
    if (targetIdx < 0 || targetIdx >= timedEvents.length) return;

    const eventA = timedEvents[eventIdx];
    const eventB = timedEvents[targetIdx];

    // Swap time slots: the earlier slot gets the event moving up, the later slot gets the event moving down.
    // Each event keeps its own duration — we just assign it to the other's time position.
    const earlierIdx = Math.min(eventIdx, targetIdx);
    const laterIdx = Math.max(eventIdx, targetIdx);
    const earlierEvent = timedEvents[earlierIdx];
    const laterEvent = timedEvents[laterIdx];

    const earlierStart = new Date(earlierEvent.startTime);
    const laterStart = new Date(laterEvent.startTime);

    // The event moving to the earlier slot starts at the earlier slot's start time
    const movingUp = direction === "up" ? eventA : eventB;
    const movingDown = direction === "up" ? eventB : eventA;

    const newUpStart = earlierStart;
    const newUpEnd = new Date(newUpStart.getTime() + getDurationMin(movingUp) * 60000);

    // The event moving down starts right after the event that moved up ends,
    // or at the later slot's original start — whichever is later (to avoid overlap but preserve gaps)
    const newDownStart = newUpEnd.getTime() > laterStart.getTime() ? newUpEnd : laterStart;
    const newDownEnd = new Date(newDownStart.getTime() + getDurationMin(movingDown) * 60000);

    const updates = [
      { id: movingUp.id, startTime: newUpStart.toISOString(), endTime: newUpEnd.toISOString() },
      { id: movingDown.id, startTime: newDownStart.toISOString(), endTime: newDownEnd.toISOString() },
    ];

    // Optimistic update — update only the two swapped events, keep everything else intact
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

    // Persist to server
    for (const u of updates) {
      await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u),
      });
    }
  };

  const resetNoteForm = () => {
    setNoteForm({ title: "", description: "", startTime: "", endTime: "", visibility: "personal" });
    setEditingNote(null);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/schedule/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...noteForm, date }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [...prev, note]);
      setShowNoteForm(false);
      resetNoteForm();
    }
  };

  const handleEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    const res = await fetch("/api/schedule/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingNote.id, ...noteForm }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      setShowNoteForm(false);
      resetNoteForm();
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("למחוק הערה זו?")) return;
    const res = await fetch(`/api/schedule/notes?id=${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleRemindNote = async (id: string) => {
    setNoteReminding(id);
    await fetch("/api/schedule/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "remind" }),
    });
    setNoteReminding(null);
  };

  const openEditNote = (note: ScheduleNote) => {
    setNoteForm({
      title: note.title,
      description: note.description || "",
      startTime: note.startTime || "",
      endTime: note.endTime || "",
      visibility: note.visibility,
    });
    setEditingNote(note);
    setShowNoteForm(true);
  };

  const myUserId = (session?.user as { id?: string })?.id;

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-2 flex items-center gap-3">
        <MdCalendarMonth className="text-dotan-green" />
        לו&quot;ז יומי
      </h1>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-dotan-mint p-2.5 mb-3">
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MdChevronRight className="text-xl" />
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-800 text-sm sm:text-base">{formatDateDisplay(date)}</div>
          {!isToday && (
            <button onClick={() => setDate(new Date().toISOString().split("T")[0])} className="text-xs text-dotan-green hover:underline flex items-center gap-1 mx-auto mt-0.5">
              <MdToday /> חזרה להיום
            </button>
          )}
        </div>
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MdChevronLeft className="text-xl" />
        </button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
        <MdFilterList className="text-gray-400 shrink-0" />
        <button onClick={() => setTypeFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${typeFilter === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
          הכל
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, { label, icon: Icon }]) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1 shrink-0 ${typeFilter === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
            <Icon className="text-xs" /> {label}
          </button>
        ))}
      </div>

      {/* Admin: Add button */}
      {isAdmin && !showAdd && !editingEvent && (
        <button onClick={() => { setShowAdd(true); resetForm(); }}
          className="w-full mb-3 bg-dotan-green-dark text-white py-2 rounded-xl hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
          <MdAdd /> הוסף אירוע
        </button>
      )}

      {showAdd && (
        <EventForm form={form} setForm={setForm} onSubmit={handleAdd} isEdit={false}
          onClose={() => { setShowAdd(false); resetForm(); }}
          allUsers={allUsers} selectedUserIds={formUserIds} onSelectedUserIdsChange={setFormUserIds} />
      )}
      {editingEvent && (
        <EventForm form={form} setForm={setForm} onSubmit={handleEdit} isEdit={true}
          onClose={() => { setEditingEvent(null); resetForm(); }}
          allUsers={allUsers} selectedUserIds={formUserIds} onSelectedUserIdsChange={setFormUserIds} />
      )}

      {/* All-day events banner */}
      {allDayEvents.length > 0 && (
        <div className="mb-3 bg-gray-50 rounded-xl border border-gray-200 p-3">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">כל היום</div>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map((event) => {
              const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
              const Icon = config.icon;
              const active = isEventNow(event, isToday);
              return (
                <div key={event.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${config.bg} ${config.border} ${active ? "ring-1 ring-dotan-green" : ""}`}>
                  <Icon className={`text-sm ${config.color}`} />
                  <span className="text-gray-700">{event.title}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-dotan-green animate-pulse" />}
                  {isAdmin && (
                    <div className="flex items-center gap-0.5 mr-1">
                      <button onClick={() => openEdit(event)} className="text-gray-300 hover:text-gray-500"><MdEdit className="text-xs" /></button>
                      <button onClick={() => handleDelete(event.id)} className="text-gray-300 hover:text-red-500"><MdDelete className="text-xs" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add note button — always visible */}
      {!showNoteForm && !editingNote && (
        <button onClick={() => { setShowNoteForm(true); resetNoteForm(); }}
          className="w-full mb-3 bg-gradient-to-l from-amber-500 to-amber-400 text-white py-2 rounded-xl hover:from-amber-600 hover:to-amber-500 transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm">
          <MdStickyNote2 className="text-base" /> הוסף הערה אישית
        </button>
      )}

      {/* Note form */}
      {showNoteForm && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300/60 rounded-2xl p-4 mb-3 shadow-sm">
          <form onSubmit={editingNote ? handleEditNote : handleAddNote} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                <MdStickyNote2 className="text-amber-500" />
                {editingNote ? "עריכת הערה" : "הערה חדשה"}
              </span>
              <button type="button" onClick={() => { setShowNoteForm(false); resetNoteForm(); }}
                className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition">
                <MdClose className="text-gray-500 text-sm" />
              </button>
            </div>
            <input type="text" placeholder="מה רוצה לזכור? *" required value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 placeholder:text-amber-300" />
            <textarea placeholder="פרטים נוספים..." value={noteForm.description}
              onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
              className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none placeholder:text-amber-300"
              rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-amber-600 font-medium block mb-1">שעת התחלה</label>
                <input type="time" value={noteForm.startTime}
                  onChange={(e) => setNoteForm({ ...noteForm, startTime: e.target.value })}
                  className="w-full border border-amber-200 bg-white rounded-xl px-2.5 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-amber-600 font-medium block mb-1">שעת סיום</label>
                <input type="time" value={noteForm.endTime}
                  onChange={(e) => setNoteForm({ ...noteForm, endTime: e.target.value })}
                  className="w-full border border-amber-200 bg-white rounded-xl px-2.5 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => setNoteForm({ ...noteForm, visibility: "personal" })}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition ${
                  noteForm.visibility === "personal"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-amber-300"
                }`}>
                <MdPerson className="text-base" /> רק אני
              </button>
              <button type="button"
                onClick={() => setNoteForm({ ...noteForm, visibility: "team" })}
                className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition ${
                  noteForm.visibility === "team"
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
                }`}>
                <MdPeople className="text-base" /> הצוות שלי
              </button>
            </div>
            <button type="submit"
              className="w-full bg-gradient-to-l from-amber-600 to-amber-500 text-white py-2.5 rounded-xl hover:from-amber-700 hover:to-amber-600 transition font-bold text-sm shadow-sm">
              {editingNote ? "עדכן הערה" : "הוסף הערה"}
            </button>
          </form>
        </div>
      )}

      {/* Timeline — events + timed notes merged */}
      <div className="relative">
        {(() => {
          // Merge timed notes into timeline
          const timedNotes = notes.filter((n) => n.startTime);
          const untimed = notes.filter((n) => !n.startTime);

          // Build unified timeline items
          type TimelineItem =
            | { kind: "group"; group: (typeof timedGroups)[0]; groupIdx: number }
            | { kind: "note"; note: ScheduleNote };

          const items: TimelineItem[] = timedGroups.map((group, groupIdx) => ({
            kind: "group" as const, group, groupIdx,
          }));

          timedNotes.forEach((note) => {
            items.push({ kind: "note" as const, note });
          });

          // Sort by start time
          items.sort((a, b) => {
            const aTime = a.kind === "group" ? a.group.startTime : `${date}T${a.note.startTime}:00`;
            const bTime = b.kind === "group" ? b.group.startTime : `${date}T${b.note.startTime}:00`;
            return new Date(aTime).getTime() - new Date(bTime).getTime();
          });

          const totalItems = items.length;

          return (
            <>
              {items.map((item, idx) => {
                if (item.kind === "group") {
                  const { group } = item;
                  const isSingle = group.events.length === 1;
                  const groupStartTime = formatTime(group.startTime);
                  const groupEndTime = formatTime(group.endTime);
                  const anyActive = group.events.some(({ event }) => isEventNow(event, isToday));
                  const firstConfig = TYPE_CONFIG[group.events[0].event.type] || TYPE_CONFIG.general;

                  return (
                    <div key={`g-${item.groupIdx}`} className="flex gap-2 mb-0 min-w-0">
                      <div className="w-12 shrink-0 text-left pt-3">
                        <div className="text-xs font-bold text-gray-800">{groupStartTime}</div>
                        <div className="text-[10px] text-gray-400">{groupEndTime}</div>
                      </div>
                      <div className="flex flex-col items-center shrink-0 w-4">
                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-3.5 z-10 ${anyActive ? "bg-dotan-green ring-2 ring-dotan-green/30" : firstConfig.dot}`} />
                        {idx < totalItems - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5" />
                        )}
                      </div>
                      {isSingle ? (
                        <div className="flex-1 mb-2 min-w-0">
                          <EventCard
                            event={group.events[0].event} idx={group.events[0].idx} compact={false}
                            isAdmin={isAdmin} isToday={isToday} timedEventsLength={timedEvents.length}
                            reminding={reminding} onDetail={setDetailEvent} onEdit={openEdit}
                            onDelete={handleDelete} onRemind={handleRemind} onAssign={openAssign} onMove={moveEvent}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 mb-2 flex gap-1.5 min-w-0">
                          {group.events.map((evItem) => (
                            <EventCard
                              key={evItem.event.id}
                              event={evItem.event} idx={evItem.idx} compact={true}
                              isAdmin={isAdmin} isToday={isToday} timedEventsLength={timedEvents.length}
                              reminding={reminding} onDetail={setDetailEvent} onEdit={openEdit}
                              onDelete={handleDelete} onRemind={handleRemind} onAssign={openAssign} onMove={moveEvent}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Note in timeline
                const { note } = item;
                const isMine = note.userId === myUserId;
                const isPersonal = note.visibility === "personal";
                return (
                  <div key={`n-${note.id}`} className="flex gap-2 mb-0 min-w-0">
                    <div className="w-12 shrink-0 text-left pt-3">
                      <div className="text-xs font-bold text-amber-600">{note.startTime}</div>
                      {note.endTime && <div className="text-[10px] text-amber-400">{note.endTime}</div>}
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-4">
                      <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-3.5 z-10 ${isPersonal ? "bg-amber-400" : "bg-orange-400"}`} />
                      {idx < totalItems - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1 mb-2 min-w-0">
                      <div className={`rounded-xl border-2 border-dashed p-2.5 sm:p-3 transition ${isPersonal ? "bg-amber-50/80 border-amber-300" : "bg-orange-50/80 border-orange-300"}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <MdStickyNote2 className={`text-sm shrink-0 ${isPersonal ? "text-amber-500" : "text-orange-500"}`} />
                              <span className="font-bold text-sm text-gray-800 truncate">{note.title}</span>
                              {!isMine && (
                                <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                                  {note.user.name}
                                </span>
                              )}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isPersonal ? "text-amber-600 bg-amber-100" : "text-orange-600 bg-orange-100"}`}>
                                {isPersonal ? "אישי" : "צוות"}
                              </span>
                            </div>
                            {note.description && (
                              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{note.description}</p>
                            )}
                          </div>
                          {isMine && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleRemindNote(note.id)} disabled={noteReminding === note.id}
                                className="p-1 text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                                <MdNotifications className={`text-sm ${noteReminding === note.id ? "animate-bounce" : ""}`} />
                              </button>
                              <button onClick={() => openEditNote(note)} className="p-1 text-gray-300 hover:text-amber-500 transition">
                                <MdEdit className="text-xs" />
                              </button>
                              <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-300 hover:text-red-500 transition">
                                <MdDelete className="text-xs" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Untimed notes section */}
              {untimed.length > 0 && (
                <div className="mt-3 mb-2">
                  <div className="text-[10px] text-amber-500 font-bold tracking-wider mb-1.5 flex items-center gap-1">
                    <MdStickyNote2 className="text-xs" /> הערות ללא שעה
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {untimed.map((note) => {
                      const isMine = note.userId === myUserId;
                      const isPersonal = note.visibility === "personal";
                      return (
                        <div key={note.id}
                          className={`rounded-xl border-2 border-dashed p-2.5 transition ${isPersonal ? "bg-amber-50/80 border-amber-300" : "bg-orange-50/80 border-orange-300"}`}>
                          <div className="flex items-start gap-2">
                            <MdStickyNote2 className={`text-base shrink-0 mt-0.5 ${isPersonal ? "text-amber-400" : "text-orange-400"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-gray-800 truncate">{note.title}</span>
                                {!isMine && (
                                  <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                                    {note.user.name}
                                  </span>
                                )}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isPersonal ? "text-amber-600 bg-amber-100" : "text-orange-600 bg-orange-100"}`}>
                                  {isPersonal ? "אישי" : "צוות"}
                                </span>
                              </div>
                              {note.description && (
                                <p className="text-[11px] text-gray-500 mt-0.5">{note.description}</p>
                              )}
                            </div>
                            {isMine && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => handleRemindNote(note.id)} disabled={noteReminding === note.id}
                                  className="p-1 text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                                  <MdNotifications className={`text-xs ${noteReminding === note.id ? "animate-bounce" : ""}`} />
                                </button>
                                <button onClick={() => openEditNote(note)} className="p-1 text-gray-300 hover:text-amber-500 transition">
                                  <MdEdit className="text-xs" />
                                </button>
                                <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-300 hover:text-red-500 transition">
                                  <MdDelete className="text-xs" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {events.length === 0 && notes.length === 0 && !showNoteForm && (
        <div className="text-center py-12 text-gray-500">
          <MdCalendarMonth className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין אירועים או הערות ליום זה</p>
          {isAdmin && <p className="text-sm mt-2">לחץ &quot;הוסף אירוע&quot; כדי להוסיף</p>}
        </div>
      )}

      {detailEvent && (
        <EventDetailModal
          event={detailEvent} isAdmin={isAdmin}
          onClose={() => setDetailEvent(null)} onEdit={openEdit}
          onAssign={openAssign} onDelete={handleDelete}
        />
      )}

      {showAssign && (
        <AssignModal
          selectedUserIds={selectedUserIds} allUsers={allUsers}
          assignTeamFilter={assignTeamFilter} userSearch={userSearch}
          onToggleUser={(userId) => setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
          )}
          onTeamFilterChange={setAssignTeamFilter} onSearchChange={setUserSearch}
          onSave={handleAssign} onClose={() => setShowAssign(null)}
        />
      )}
    </div>
  );
}
