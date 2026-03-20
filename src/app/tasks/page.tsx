"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  MdAssignment, MdWarning, MdNotifications, MdCalendarToday,
  MdChevronLeft, MdChevronRight, MdAccessTime, MdFlag, MdFilterList,
  MdAdd, MdClose, MdCheck, MdDelete, MdEdit, MdSend, MdReplay,
  MdExpandMore, MdExpandLess, MdPerson, MdPeople,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import Avatar from "@/components/Avatar";

interface TaskUser {
  id: string;
  name: string;
  image: string | null;
}

interface TaskResponse {
  id: string;
  content: string;
  createdAt: string;
  user: TaskUser;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startDate: string;
  endDate: string | null;
  dueDate: string | null;
  allDay: boolean;
  priority: string;
  recurring: boolean;
  status: string;
  userId: string | null;
  user: TaskUser | null;
  responses: TaskResponse[];
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof MdAssignment }> = {
  deadline: { label: "דדליין", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: MdWarning },
  reminder: { label: "תזכורת", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: MdNotifications },
  task: { label: "משימה", color: "text-dotan-green", bg: "bg-dotan-mint-light", border: "border-dotan-green", icon: MdAssignment },
  weekly: { label: "שבועי", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: MdCalendarToday },
  daily: { label: "יומי", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", icon: MdAccessTime },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "דחוף", color: "text-red-600", dot: "bg-red-500" },
  high: { label: "חשוב", color: "text-orange-500", dot: "bg-orange-400" },
  normal: { label: "רגיל", color: "text-dotan-green", dot: "bg-dotan-green" },
  low: { label: "נמוך", color: "text-gray-400", dot: "bg-gray-400" },
};

const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAYS_HE = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

function toLocalKey(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
}
const TODAY_KEY = toLocalKey(new Date());
function isToday(ds: string) { return toLocalKey(new Date(ds)) === TODAY_KEY; }
function isPast(ds: string) { return new Date(ds) < new Date(); }
function formatTime(ds: string) { return new Date(ds).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jerusalem"}); }
function formatDate(ds: string) { const d=new Date(ds); return `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`; }
function formatRelative(ds: string) {
  const tom = new Date(); tom.setDate(tom.getDate()+1);
  if (isToday(ds)) return "היום";
  if (toLocalKey(tom) === toLocalKey(new Date(ds))) return "מחר";
  return formatDate(ds);
}

function daysUntil(ds: string) {
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(ds); target.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function getWeekDates(offset: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + offset * 7);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return {
    start, end,
    startStr: toLocalKey(start),
    endStr: toLocalKey(end),
  };
}

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"week" | "list">("list");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [reminding, setReminding] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", category: "task", startDate: "",
    startTime: "", endTime: "", dueDate: "", priority: "normal", allDay: true,
  });

  const myUserId = (session?.user as { id?: string })?.id;

  const { startStr, endStr } = getWeekDates(weekOffset);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const from = `${startStr}T00:00:00`;
    const to = `${endStr}T23:59:59`;
    const catParam = categoryFilter !== "all" ? `&category=${categoryFilter}` : "";
    const scopeParam = scope === "all" ? "&scope=all" : "";
    const res = await fetch(`/api/tasks?from=${from}&to=${to}${catParam}${scopeParam}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
      setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }, [startStr, endStr, categoryFilter, scope]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchTasks();
  }, [status, router, fetchTasks]);

  const resetForm = () => {
    setForm({ title:"",description:"",category:"task",startDate:"",startTime:"",endTime:"",dueDate:"",priority:"normal",allDay:true });
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = form.startDate || TODAY_KEY;
    const startDate = form.allDay ? `${dateStr}T00:00:00` : `${dateStr}T${form.startTime || "00:00"}:00`;
    const endDate = !form.allDay && form.endTime ? `${dateStr}T${form.endTime}:00` : null;
    const dueDate = form.dueDate ? `${form.dueDate}T23:59:59` : null;

    const payload = {
      ...(editingTask ? { id: editingTask.id } : {}),
      title: form.title,
      description: form.description,
      category: form.category,
      startDate,
      endDate,
      dueDate,
      allDay: form.allDay,
      priority: form.priority,
    };

    const res = await fetch("/api/tasks", {
      method: editingTask ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const task = await res.json();
      if (editingTask) {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      } else {
        setTasks(prev => [...prev, task].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
      }
      setShowForm(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק משימה זו?")) return;
    const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAction = async (id: string, action: string, content?: string) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, content }),
    });
    if (res.ok) {
      const data = await res.json();
      if (action === "remind") return;
      setTasks(prev => prev.map(t => t.id === data.id ? data : t));
    }
  };

  const handleRemind = async (id: string) => {
    setReminding(id);
    await handleAction(id, "remind");
    setReminding(null);
  };

  const handleResponse = async (taskId: string) => {
    const text = responseText[taskId]?.trim();
    if (!text) return;
    await handleAction(taskId, "respond", text);
    setResponseText(prev => ({ ...prev, [taskId]: "" }));
  };

  const openEdit = (task: Task) => {
    const start = new Date(task.startDate);
    setForm({
      title: task.title,
      description: task.description || "",
      category: task.category,
      startDate: toLocalKey(start),
      startTime: start.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jerusalem"}),
      endTime: task.endDate ? new Date(task.endDate).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jerusalem"}) : "",
      dueDate: task.dueDate ? toLocalKey(new Date(task.dueDate)) : "",
      priority: task.priority,
      allDay: task.allDay,
    });
    setEditingTask(task);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // Derived data
  const myTasks = tasks.filter(t => t.userId === myUserId);
  const openTasks = myTasks.filter(t => t.status === "open");
  const dueSoonTasks = openTasks.filter(t => t.dueDate && daysUntil(t.dueDate) <= 3 && daysUntil(t.dueDate) >= 0);
  const overdueTasks = openTasks.filter(t => t.dueDate && daysUntil(t.dueDate) < 0);

  const { start: weekStart, end: weekEnd } = getWeekDates(weekOffset);
  const weekLabel = `${weekStart.getDate()} ${MONTHS_HE[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTHS_HE[weekEnd.getMonth()]}`;

  // Group by day for week view
  const tasksByDay: Record<string, Task[]> = {};
  for (let i=0; i<7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    tasksByDay[toLocalKey(d)] = [];
  }
  tasks.forEach(t => {
    const key = toLocalKey(new Date(t.startDate));
    if (tasksByDay[key]) tasksByDay[key].push(t);
  });

  if (status === "loading" || loading) return <InlineLoading />;

  const canEdit = (task: Task) => task.userId === myUserId || isAdmin;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-3 flex items-center gap-3">
        <MdAssignment className="text-dotan-green" />
        לוח משימות
      </h1>

      {/* Alerts: overdue + due soon */}
      {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
        <div className="space-y-2 mb-4">
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
              <div className="text-sm font-bold text-red-600 flex items-center gap-1.5 mb-1.5">
                <MdWarning className="animate-pulse" /> {overdueTasks.length} משימות באיחור!
              </div>
              <div className="space-y-1">
                {overdueTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[t.priority].dot}`} />
                    <span className="font-medium text-gray-800 truncate flex-1">{t.title}</span>
                    <span className="text-red-500 font-bold shrink-0">
                      יעד: {formatDate(t.dueDate!)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {dueSoonTasks.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
              <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5 mb-1.5">
                <MdNotifications /> {dueSoonTasks.length} משימות מתקרבות לדדליין
              </div>
              <div className="space-y-1">
                {dueSoonTasks.map(t => {
                  const days = daysUntil(t.dueDate!);
                  return (
                    <div key={t.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[t.priority].dot}`} />
                      <span className="font-medium text-gray-800 truncate flex-1">{t.title}</span>
                      <span className="text-amber-600 font-bold shrink-0">
                        {days === 0 ? "היום!" : days === 1 ? "מחר" : `עוד ${days} ימים`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add task button */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); resetForm(); }}
          className="w-full mb-3 bg-dotan-green-dark text-white py-2.5 rounded-xl hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm">
          <MdAdd /> הוסף משימה
        </button>
      )}

      {/* Task form */}
      {showForm && (
        <div ref={formRef} className="bg-white border-2 border-dotan-mint rounded-2xl p-4 mb-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-dotan-green-dark flex items-center gap-1.5">
                <MdAssignment className="text-dotan-green" />
                {editingTask ? "עריכת משימה" : "משימה חדשה"}
              </span>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <MdClose className="text-gray-500 text-sm" />
              </button>
            </div>

            <input type="text" placeholder="כותרת המשימה *" required value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-dotan-green focus:border-dotan-green" />

            <textarea placeholder="תיאור (אופציונלי)" value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-dotan-green resize-none" rows={2} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-1">סוג</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm">
                  {Object.entries(CATEGORY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-1">עדיפות</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm">
                  {Object.entries(PRIORITY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-1">תאריך</label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm({...form, startDate: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-red-500 font-medium block mb-1">תאריך גמר ביצוע</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm({...form, dueDate: e.target.value})}
                  className="w-full border border-red-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-300" />
              </div>
            </div>

            {!form.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-[10px] text-gray-500 font-medium block mb-1">שעת התחלה</label>
                  <input type="time" value={form.startTime}
                    onChange={e => setForm({...form, startTime: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-gray-500 font-medium block mb-1">שעת סיום</label>
                  <input type="time" value={form.endTime}
                    onChange={e => setForm({...form, endTime: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.allDay}
                onChange={e => setForm({...form, allDay: e.target.checked})}
                className="rounded border-gray-300 text-dotan-green focus:ring-dotan-green" />
              כל היום
            </label>

            <button type="submit"
              className="w-full bg-dotan-green-dark text-white py-2.5 rounded-xl hover:bg-dotan-green transition font-bold text-sm">
              {editingTask ? "עדכן משימה" : "הוסף משימה"}
            </button>
          </form>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setWeekOffset(w => w-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <MdChevronRight className="text-lg" />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-dotan-mint-light hover:bg-dotan-mint transition">
              היום
            </button>
            <button onClick={() => setWeekOffset(w => w+1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <MdChevronLeft className="text-lg" />
            </button>
            <span className="font-bold text-gray-700 text-xs sm:text-sm mr-1">{weekLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Scope toggle */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setScope("mine")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${scope==="mine" ? "bg-white shadow-sm text-dotan-green-dark" : "text-gray-500"}`}>
                <MdPerson className="text-xs" /> שלי
              </button>
              {isAdmin && (
                <button onClick={() => setScope("all")}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${scope==="all" ? "bg-white shadow-sm text-dotan-green-dark" : "text-gray-500"}`}>
                  <MdPeople className="text-xs" /> הכל
                </button>
              )}
            </div>
            {/* View toggle */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView("list")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${view==="list" ? "bg-white shadow-sm" : "text-gray-500"}`}>
                רשימה
              </button>
              <button onClick={() => setView("week")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${view==="week" ? "bg-white shadow-sm" : "text-gray-500"}`}>
                שבוע
              </button>
            </div>
            {/* Category filter */}
            <div className="flex items-center gap-1">
              <MdFilterList className="text-gray-400 text-sm" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-1 focus:ring-dotan-green">
                <option value="all">הכל</option>
                {Object.entries(CATEGORY_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Week View */}
      {view === "week" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {Object.entries(tasksByDay).map(([dateKey, dayTasks]) => {
            const d = new Date(dateKey + "T12:00:00");
            const today = dateKey === TODAY_KEY;
            return (
              <div key={dateKey} className={`bg-white rounded-xl border overflow-hidden ${today ? "border-dotan-gold border-2 shadow-md" : "border-gray-200"}`}>
                <div className={`px-2 py-1.5 text-center ${today ? "bg-dotan-gold text-dotan-green-dark" : "bg-gray-50"}`}>
                  <div className="text-[10px] text-gray-500 font-medium">{DAYS_HE[d.getDay()]}</div>
                  <div className={`text-base font-bold ${today ? "text-dotan-green-dark" : "text-gray-800"}`}>{d.getDate()}</div>
                </div>
                <div className="p-1.5 space-y-1 min-h-[60px]">
                  {dayTasks.length === 0 && <div className="text-[10px] text-gray-300 text-center py-3">—</div>}
                  {dayTasks.map(task => {
                    const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
                    return (
                      <button key={task.id} onClick={() => setExpandedTask(expandedTask===task.id ? null : task.id)}
                        className={`w-full text-right p-1.5 rounded-lg border text-[11px] transition ${task.status==="done" ? "bg-gray-50 border-gray-200 opacity-60 line-through" : `${config.bg} ${config.border}`}`}>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_CONFIG[task.priority].dot}`} />
                          <span className="font-medium truncate">{task.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <MdAssignment className="text-5xl mx-auto mb-4 text-gray-300" />
              <p>אין משימות בתקופה זו</p>
              <p className="text-sm mt-1">לחץ &quot;הוסף משימה&quot; כדי להוסיף</p>
            </div>
          )}
          {tasks.map(task => {
            const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
            const Icon = config.icon;
            const isExpanded = expandedTask === task.id;
            const isDone = task.status === "done";
            const isMine = task.userId === myUserId;
            const isOverdue = task.dueDate && daysUntil(task.dueDate) < 0 && !isDone;
            const dueDays = task.dueDate ? daysUntil(task.dueDate) : null;

            return (
              <div key={task.id}
                className={`bg-white rounded-xl border-2 transition overflow-hidden ${
                  isDone ? "border-gray-200 opacity-70" :
                  isOverdue ? "border-red-300 bg-red-50/30" :
                  `${config.border}`
                }`}>
                {/* Task header */}
                <button onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  className="w-full text-right p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDone ? "bg-gray-300" : PRIORITY_CONFIG[task.priority].dot}`} />
                    <Icon className={`text-lg shrink-0 ${isDone ? "text-gray-400" : config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-gray-500">
                          {formatRelative(task.startDate)}
                          {!task.allDay && ` ${formatTime(task.startDate)}`}
                        </span>
                        {task.dueDate && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isDone ? "bg-green-100 text-green-600" :
                            isOverdue ? "bg-red-100 text-red-600" :
                            dueDays !== null && dueDays <= 3 ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {isDone ? "הושלם" :
                             isOverdue ? `באיחור ${Math.abs(dueDays!)} ימים` :
                             dueDays === 0 ? "יעד: היום!" :
                             dueDays === 1 ? "יעד: מחר" :
                             `יעד: ${formatDate(task.dueDate)}`}
                          </span>
                        )}
                        {!isMine && task.user && (
                          <span className="text-[10px] text-gray-400">
                            {task.userId ? task.user.name : "כללי"}
                          </span>
                        )}
                        {task.responses.length > 0 && (
                          <span className="text-[10px] text-blue-500 font-medium">{task.responses.length} תגובות</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${config.bg} ${config.color} ${config.border}`}>
                        {config.label}
                      </span>
                      {isExpanded ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-3 sm:p-4 space-y-3">
                    {task.description && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isDone ? (
                        <button onClick={() => handleAction(task.id, "done")}
                          className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-1">
                          <MdCheck className="text-sm" /> סיום משימה
                        </button>
                      ) : (
                        <button onClick={() => handleAction(task.id, "reopen")}
                          className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition font-medium flex items-center gap-1">
                          <MdReplay className="text-sm" /> פתח מחדש
                        </button>
                      )}
                      <button onClick={() => handleRemind(task.id)} disabled={reminding === task.id}
                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition font-medium flex items-center gap-1 disabled:opacity-50">
                        <MdNotifications className={`text-sm ${reminding===task.id ? "animate-bounce" : ""}`} /> תזכורת
                      </button>
                      {canEdit(task) && (
                        <>
                          <button onClick={() => openEdit(task)}
                            className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-1">
                            <MdEdit className="text-sm" /> עריכה
                          </button>
                          <button onClick={() => handleDelete(task.id)}
                            className="text-xs text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition font-medium flex items-center gap-1">
                            <MdDelete className="text-sm" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Responses */}
                    {task.responses.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-gray-500">תגובות</div>
                        {task.responses.map(r => (
                          <div key={r.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                            <Avatar name={r.user.name} image={r.user.image} size="xs" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-700">{r.user.name}</span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(r.createdAt).toLocaleDateString("he-IL",{day:"numeric",month:"short"})}
                                  {" "}
                                  {new Date(r.createdAt).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add response */}
                    <div className="flex gap-2">
                      <input type="text" placeholder="הוסף תגובה..."
                        value={responseText[task.id] || ""}
                        onChange={e => setResponseText(prev => ({...prev, [task.id]: e.target.value}))}
                        onKeyDown={e => { if (e.key === "Enter") handleResponse(task.id); }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-dotan-green" />
                      <button onClick={() => handleResponse(task.id)}
                        disabled={!responseText[task.id]?.trim()}
                        className="bg-dotan-green text-white px-3 rounded-lg hover:bg-dotan-green-dark transition disabled:opacity-30">
                        <MdSend className="text-sm" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
        {Object.entries(PRIORITY_CONFIG).map(([k,v]) => (
          <div key={k} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}</div>
        ))}
        <div className="w-px h-3 bg-gray-200" />
        {Object.entries(CATEGORY_CONFIG).map(([k,{label,icon:I,color}]) => (
          <div key={k} className="flex items-center gap-1"><I className={color} /> {label}</div>
        ))}
      </div>
    </div>
  );
}
