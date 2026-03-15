"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdCalendarMonth, MdChevronRight, MdChevronLeft, MdAdd, MdEdit, MdDelete,
  MdNotifications, MdClose, MdSave, MdPeople, MdFilterList, MdAccessTime,
  MdRestaurant, MdFitnessCenter, MdFlag, MdFreeBreakfast, MdEvent,
  MdToday, MdPersonAdd,
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

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  general: { label: "כללי", icon: MdEvent, color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
  meal: { label: "ארוחה", icon: MdRestaurant, color: "text-orange-600", bg: "bg-orange-50 border-orange-300" },
  training: { label: "אימון", icon: MdFitnessCenter, color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  ceremony: { label: "טקס/מסדר", icon: MdFlag, color: "text-purple-600", bg: "bg-purple-50 border-purple-300" },
  free: { label: "זמן חופשי", icon: MdFreeBreakfast, color: "text-green-600", bg: "bg-green-50 border-green-300" },
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

  const resetForm = () => {
    setForm({ title: "", description: "", startTime: "", endTime: "", allDay: false, target: "all", type: "general" });
  };

  // Convert local Israel time input to ISO string
  const toISO = (dateStr: string, timeStr: string) =>
    new Date(`${dateStr}T${timeStr}:00`).toISOString();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = form.allDay
      ? new Date(`${date}T00:00:00`).toISOString()
      : toISO(date, form.startTime);
    const endTime = form.allDay
      ? new Date(`${date}T23:59:59`).toISOString()
      : toISO(date, form.endTime);

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

    const startTime = form.allDay
      ? new Date(`${date}T00:00:00`).toISOString()
      : toISO(date, form.startTime);
    const endTime = form.allDay
      ? new Date(`${date}T23:59:59`).toISOString()
      : toISO(date, form.endTime);

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
      startTime: `${start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}`,
      endTime: `${end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}`,
      allDay: event.allDay,
      target: event.target,
      type: event.type,
    });
    setEditingEvent(event);
    // Scroll to top where the form appears
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

  const filteredUsers = allUsers.filter((u) => {
    if (assignTeamFilter !== "all" && u.team !== parseInt(assignTeamFilter)) return false;
    if (userSearch && !u.name.includes(userSearch)) return false;
    return true;
  });

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  const EventForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) => (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-dotan-mint shadow-sm p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-dotan-green-dark">{isEdit ? "עריכת אירוע" : "הוספת אירוע"}</h3>
        <button type="button" onClick={() => { isEdit ? setEditingEvent(null) : setShowAdd(false); resetForm(); }}
          className="text-gray-400 hover:text-gray-600"><MdClose /></button>
      </div>
      <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="כותרת" required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none" />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="תיאור (אופציונלי)" rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none resize-none" />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={form.allDay}
            onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            className="rounded border-gray-300" />
          כל היום
        </label>
      </div>
      {!form.allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">התחלה</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">סיום</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              required className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">יעד</label>
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {Object.entries(TARGET_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">סוג</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {Object.entries(TYPE_CONFIG).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit"
        className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
        <MdSave /> {isEdit ? "שמור שינויים" : "הוסף אירוע"}
      </button>
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
      <div className="flex items-center justify-between bg-white rounded-xl border border-dotan-mint p-3 mb-4">
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MdChevronRight className="text-xl" />
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-800">{formatDateDisplay(date)}</div>
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
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <MdFilterList className="text-gray-400 shrink-0" />
        <button onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 ${typeFilter === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          הכל
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, { label, icon: Icon }]) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 shrink-0 ${typeFilter === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Icon className="text-sm" /> {label}
          </button>
        ))}
      </div>

      {/* Admin: Add button */}
      {isAdmin && !showAdd && !editingEvent && (
        <button onClick={() => { setShowAdd(true); resetForm(); }}
          className="w-full mb-4 bg-dotan-green-dark text-white py-2.5 rounded-xl hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
          <MdAdd /> הוסף אירוע
        </button>
      )}

      {/* Add form */}
      {showAdd && <EventForm onSubmit={handleAdd} isEdit={false} />}

      {/* Edit form */}
      {editingEvent && <EventForm onSubmit={handleEdit} isEdit={true} />}

      {/* Events timeline */}
      <div className="space-y-2">
        {events.map((event) => {
          const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
          const Icon = config.icon;
          const active = isNow(event);

          return (
            <div key={event.id} className={`rounded-xl border p-3 sm:p-4 transition ${config.bg} ${active ? "ring-2 ring-dotan-green shadow-md" : ""}`}>
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 shrink-0 ${config.color}`}>
                  <Icon className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">{event.title}</h3>
                    {active && (
                      <span className="px-2 py-0.5 bg-dotan-green text-white rounded-full text-[10px] font-bold animate-pulse">
                        עכשיו
                      </span>
                    )}
                    {event.target !== "all" && (
                      <span className="px-2 py-0.5 bg-white/70 border rounded-full text-[10px] font-medium text-gray-600">
                        {TARGET_LABELS[event.target] || event.target}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <MdAccessTime />
                    {event.allDay ? "כל היום" : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
                  </div>
                  {event.description && (
                    <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-line">{event.description}</p>
                  )}
                  {event.assignees.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <MdPeople className="text-gray-400 text-sm" />
                      {event.assignees.map((a) => (
                        <div key={a.id} className="flex items-center gap-1 bg-white/60 rounded-full px-2 py-0.5">
                          <Avatar name={a.user.name} image={a.user.image} size="xs" />
                          <span className="text-[10px] text-gray-600">{a.user.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Admin actions — below content on mobile */}
                  {isAdmin && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-black/5">
                      <button onClick={() => handleRemind(event.id)} disabled={reminding === event.id}
                        title="שלח תזכורת"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition disabled:opacity-50">
                        <MdNotifications className={`text-base ${reminding === event.id ? "animate-bounce" : ""}`} />
                        <span className="hidden sm:inline">תזכורת</span>
                      </button>
                      <button onClick={() => openAssign(event)} title="שיוך משתמשים"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 transition">
                        <MdPersonAdd className="text-base" />
                        <span className="hidden sm:inline">שיוך</span>
                      </button>
                      <button onClick={() => openEdit(event)} title="ערוך"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-dotan-green transition">
                        <MdEdit className="text-base" />
                        <span className="hidden sm:inline">ערוך</span>
                      </button>
                      <button onClick={() => handleDelete(event.id)} title="מחק"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition mr-auto">
                        <MdDelete className="text-base" />
                        <span className="hidden sm:inline">מחק</span>
                      </button>
                    </div>
                  )}
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
