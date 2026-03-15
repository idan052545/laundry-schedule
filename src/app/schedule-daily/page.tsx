"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  MdCalendarMonth, MdChevronRight, MdChevronLeft, MdAdd, MdEdit, MdDelete,
  MdNotifications, MdClose, MdSave, MdPeople, MdFilterList, MdAccessTime,
  MdRestaurant, MdFitnessCenter, MdFlag, MdFreeBreakfast, MdEvent,
  MdToday, MdPersonAdd, MdDragIndicator,
} from "react-icons/md";
import Avatar from "@/components/Avatar";

interface Assignee {
  id: string;
  userId: string;
  user: { id: string; name: string; image: string | null; team: number | null };
}

interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  target: string;
  type: string;
  assignees: Assignee[];
}

interface UserOption {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string; dot: string }> = {
  general: { label: "כללי", icon: MdEvent, color: "text-gray-600", bg: "bg-white", border: "border-gray-200", dot: "bg-gray-400" },
  meal: { label: "ארוחה", icon: MdRestaurant, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-400" },
  training: { label: "אימון", icon: MdFitnessCenter, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-400" },
  ceremony: { label: "טקס/מסדר", icon: MdFlag, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-400" },
  free: { label: "זמן חופשי", icon: MdFreeBreakfast, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-400" },
};

const TARGET_LABELS: Record<string, string> = {
  all: "כל הפלוגה",
  "team-14": "צוות 14",
  "team-15": "צוות 15",
  "team-16": "צוות 16",
  "team-17": "צוות 17",
};

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

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // Form state
  const [form, setForm] = useState({
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
    }
  }, [status, router, fetchEvents, fetchUsers]);

  useEffect(() => {
    if (status === "authenticated") fetchEvents();
  }, [date, typeFilter, status, fetchEvents]);

  // Split events into all-day and timed
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const goToday = () => setDate(new Date().toISOString().split("T")[0]);

  const formatTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

  const formatDateDisplay = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  const isToday = date === new Date().toISOString().split("T")[0];

  const isNow = (event: ScheduleEvent) => {
    if (!isToday) return false;
    const now = Date.now();
    return now >= new Date(event.startTime).getTime() && now <= new Date(event.endTime).getTime();
  };

  const getDurationMin = (event: ScheduleEvent) => {
    return Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000);
  };

  const resetForm = () => {
    setForm({ title: "", description: "", startTime: "", endTime: "", allDay: false, target: "all", type: "general" });
  };

  const toISO = (dateStr: string, timeStr: string) =>
    new Date(`${dateStr}T${timeStr}:00`).toISOString();

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
      const event = await res.json();
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
      const updated = await res.json();
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

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Drag & drop with smart time shifting
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragCounter.current++;
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOverIdx(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIdx: number) => {
    dragCounter.current = 0;
    setDragOverIdx(null);
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }

    // Reorder: move dragIdx item to dropIdx position
    const reordered = [...timedEvents];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    // Smart time shifting: chain events sequentially from the first affected position
    const startIdx = Math.min(dragIdx, dropIdx);
    const updates: { id: string; startTime: string; endTime: string }[] = [];

    for (let i = startIdx; i < reordered.length; i++) {
      const ev = reordered[i];
      const duration = getDurationMin(ev);

      let newStart: Date;
      if (i === 0) {
        // First event keeps its original start, unless it was moved
        if (i >= startIdx && i !== dragIdx) {
          newStart = new Date(reordered[0].startTime);
        } else {
          newStart = new Date(ev.startTime);
        }
      } else {
        // Start right after previous event ends
        const prevEnd = updates.length > 0 && updates[updates.length - 1]
          ? new Date(updates[updates.length - 1].endTime)
          : new Date(reordered[i - 1].endTime);
        // Only shift if this event would overlap with previous
        const currentStart = new Date(ev.startTime);
        newStart = currentStart < prevEnd ? prevEnd : currentStart;
      }

      const newEnd = new Date(newStart.getTime() + duration * 60000);
      const origStart = new Date(ev.startTime);
      const origEnd = new Date(ev.endTime);

      // Only update if time actually changed
      if (Math.abs(newStart.getTime() - origStart.getTime()) > 60000 ||
          Math.abs(newEnd.getTime() - origEnd.getTime()) > 60000) {
        updates.push({ id: ev.id, startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
      }
    }

    // Optimistic update
    const newEvents = reordered.map((ev, i) => {
      const update = updates.find((u) => u.id === ev.id);
      if (update) return { ...ev, startTime: update.startTime, endTime: update.endTime };
      return ev;
    });
    setEvents([...allDayEvents, ...newEvents].sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }));
    setDragIdx(null);

    // Send updates to server
    for (const u of updates) {
      await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u),
      });
    }
  };

  // Touch drag support
  const touchStartY = useRef(0);
  const touchDragIdx = useRef<number | null>(null);

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDragIdx.current = idx;
    setDragIdx(idx);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDragIdx.current === null) return;
    const touch = e.touches[0];
    const elements = document.querySelectorAll("[data-timeline-idx]");
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const idx = parseInt(el.getAttribute("data-timeline-idx") || "-1");
        if (idx >= 0) setDragOverIdx(idx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchDragIdx.current !== null && dragOverIdx !== null) {
      handleDrop(dragOverIdx);
    }
    touchDragIdx.current = null;
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const filteredUsers = allUsers.filter((u) => {
    if (assignTeamFilter !== "all" && u.team !== parseInt(assignTeamFilter)) return false;
    if (userSearch && !u.name.includes(userSearch)) return false;
    return true;
  });

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  const EventForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) => (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-dotan-mint shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-dotan-green-dark text-white">
        <h3 className="font-bold text-sm">{isEdit ? "עריכת אירוע" : "הוספת אירוע"}</h3>
        <button type="button" onClick={() => { isEdit ? setEditingEvent(null) : setShowAdd(false); resetForm(); }}
          className="text-white/70 hover:text-white"><MdClose /></button>
      </div>
      <div className="p-4 space-y-3">
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="כותרת האירוע" required
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent focus:bg-white outline-none" />
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="תיאור (אופציונלי)"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent focus:bg-white outline-none" />
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 pr-1">
            <input type="checkbox" checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="rounded border-gray-300 w-3.5 h-3.5" />
            כל היום
          </label>
          {!form.allDay && (
            <>
              <div className="h-4 w-px bg-gray-300" />
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required className="flex-1 bg-transparent text-sm text-center outline-none min-w-0" />
              <span className="text-gray-400 text-xs">—</span>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required className="flex-1 bg-transparent text-sm text-center outline-none min-w-0" />
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
            className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            {Object.entries(TARGET_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            {Object.entries(TYPE_CONFIG).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
          <MdSave /> {isEdit ? "שמור" : "הוסף"}
        </button>
      </div>
    </form>
  );

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
            <button onClick={goToday} className="text-xs text-dotan-green hover:underline flex items-center gap-1 mx-auto mt-0.5">
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

      {showAdd && <EventForm onSubmit={handleAdd} isEdit={false} />}
      {editingEvent && <EventForm onSubmit={handleEdit} isEdit={true} />}

      {/* All-day events banner */}
      {allDayEvents.length > 0 && (
        <div className="mb-3 bg-gray-50 rounded-xl border border-gray-200 p-3">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">כל היום</div>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map((event) => {
              const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
              const Icon = config.icon;
              const active = isNow(event);
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

      {/* Timeline */}
      <div className="relative">
        {timedEvents.map((event, idx) => {
          const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
          const Icon = config.icon;
          const active = isNow(event);
          const duration = getDurationMin(event);
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div
              key={event.id}
              data-timeline-idx={idx}
              draggable={isAdmin}
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              onTouchStart={(e) => isAdmin && handleTouchStart(idx, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex gap-3 mb-0 transition-all ${isDragging ? "opacity-40 scale-[0.98]" : ""} ${isDragOver ? "translate-y-1" : ""}`}
            >
              {/* Time column */}
              <div className="w-14 shrink-0 text-left pt-3">
                <div className="text-xs font-bold text-gray-800">{formatTime(event.startTime)}</div>
                <div className="text-[10px] text-gray-400">{formatTime(event.endTime)}</div>
              </div>

              {/* Timeline line + dot */}
              <div className="flex flex-col items-center shrink-0 w-4">
                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-3.5 z-10 ${active ? "bg-dotan-green ring-2 ring-dotan-green/30" : config.dot}`} />
                {idx < timedEvents.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5" />
                )}
              </div>

              {/* Event card */}
              <div className={`flex-1 mb-2 rounded-xl border p-3 transition ${config.bg} ${config.border} ${active ? "ring-2 ring-dotan-green shadow-md" : "shadow-sm"} ${isDragOver ? "border-dotan-green border-dashed bg-dotan-mint-light/30" : ""}`}>
                <div className="flex items-start gap-2">
                  {isAdmin && (
                    <div className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none">
                      <MdDragIndicator />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Icon className={`text-base ${config.color} shrink-0`} />
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">{event.title}</h3>
                      {active && (
                        <span className="px-1.5 py-0.5 bg-dotan-green text-white rounded text-[9px] font-bold animate-pulse">
                          עכשיו
                        </span>
                      )}
                      {event.target !== "all" && (
                        <span className="px-1.5 py-0.5 bg-white/80 border rounded text-[9px] font-medium text-gray-500">
                          {TARGET_LABELS[event.target] || event.target}
                        </span>
                      )}
                    </div>

                    {duration > 0 && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {duration >= 60 ? `${Math.floor(duration / 60)} שע׳` : ""}{duration % 60 > 0 ? ` ${duration % 60} דק׳` : ""}
                      </div>
                    )}

                    {event.description && (
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{event.description}</p>
                    )}

                    {event.assignees.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {event.assignees.slice(0, 4).map((a) => (
                          <Avatar key={a.id} name={a.user.name} image={a.user.image} size="xs" />
                        ))}
                        {event.assignees.length > 4 && (
                          <span className="text-[10px] text-gray-400">+{event.assignees.length - 4}</span>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-2.5 mt-2 pt-1.5 border-t border-black/5">
                        <button onClick={() => handleRemind(event.id)} disabled={reminding === event.id}
                          className="text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                          <MdNotifications className={`text-sm ${reminding === event.id ? "animate-bounce" : ""}`} />
                        </button>
                        <button onClick={() => openAssign(event)} className="text-gray-300 hover:text-purple-500 transition">
                          <MdPersonAdd className="text-sm" />
                        </button>
                        <button onClick={() => openEdit(event)} className="text-gray-300 hover:text-dotan-green transition">
                          <MdEdit className="text-sm" />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="text-gray-300 hover:text-red-500 transition mr-auto">
                          <MdDelete className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdCalendarMonth className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין אירועים ליום זה</p>
          {isAdmin && <p className="text-sm mt-2">לחץ &quot;הוסף אירוע&quot; כדי להוסיף</p>}
        </div>
      )}

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowAssign(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <MdPeople className="text-dotan-green" /> שיוך משתמשים
              </h3>
              <button onClick={() => setShowAssign(null)} className="text-gray-400 hover:text-gray-600">
                <MdClose />
              </button>
            </div>
            <div className="p-3 border-b space-y-2 shrink-0">
              <input type="text" placeholder="חפש שם..." value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="flex gap-1.5 overflow-x-auto">
                {["all", "14", "15", "16", "17"].map((t) => (
                  <button key={t} onClick={() => setAssignTeamFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${assignTeamFilter === t ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
                    {t === "all" ? "הכל" : `צוות ${t}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredUsers.map((u) => (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition text-right ${selectedUserIds.includes(u.id) ? "bg-dotan-mint-light border border-dotan-green" : "hover:bg-gray-50 border border-transparent"}`}>
                  <Avatar name={u.name} image={u.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{u.name}</span>
                    {u.team && <span className="text-xs text-gray-400 mr-2">צוות {u.team}</span>}
                  </div>
                  {selectedUserIds.includes(u.id) && (
                    <span className="text-dotan-green text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-3 border-t shrink-0">
              <button onClick={handleAssign}
                className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium text-sm flex items-center justify-center gap-2">
                <MdSave /> שמור ({selectedUserIds.length} נבחרו)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
