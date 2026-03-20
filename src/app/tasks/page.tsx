"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdAssignment, MdChevronLeft, MdChevronRight, MdFilterList,
  MdAdd, MdPerson, MdPeople,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, getCategoryLabels, getMonthsArray } from "./constants";
import { TODAY_KEY, toLocalKey, getWeekDates, daysUntil } from "./utils";
import { Task, TaskFormData } from "./types";
import TaskAlerts from "./TaskAlerts";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";
import TaskWeekView from "./TaskWeekView";
import TaskLegend from "./TaskLegend";

const EMPTY_FORM: TaskFormData = {
  title: "", description: "", category: "task", startDate: "",
  startTime: "", endTime: "", dueDate: "", priority: "normal", allDay: true,
};

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
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
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);

  const myUserId = (session?.user as { id?: string })?.id;

  const { startStr, endStr } = getWeekDates(weekOffset);

  const categoryLabels = getCategoryLabels(t);
  const months = getMonthsArray(t);

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
    setForm(EMPTY_FORM);
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
    if (!confirm(t.tasks.deleteTask)) return;
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
  };

  // Derived data
  const myTasks = tasks.filter(t => t.userId === myUserId);
  const openTasks = myTasks.filter(t => t.status === "open");
  const dueSoonTasks = openTasks.filter(t => t.dueDate && daysUntil(t.dueDate) <= 3 && daysUntil(t.dueDate) >= 0);
  const overdueTasks = openTasks.filter(t => t.dueDate && daysUntil(t.dueDate) < 0);

  const { start: weekStart, end: weekEnd } = getWeekDates(weekOffset);
  const weekLabel = `${weekStart.getDate()} ${months[weekStart.getMonth()]} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()]}`;

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
        {t.tasks.title}
      </h1>

      <TaskAlerts overdueTasks={overdueTasks} dueSoonTasks={dueSoonTasks} />

      {/* Add task button */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); resetForm(); }}
          className="w-full mb-3 bg-dotan-green-dark text-white py-2.5 rounded-xl hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm">
          <MdAdd /> {t.tasks.addTask}
        </button>
      )}

      {showForm && (
        <TaskForm
          form={form}
          setForm={setForm}
          editingTask={editingTask}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); resetForm(); }}
        />
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
              {t.tasks.todayTab}
            </button>
            <button onClick={() => setWeekOffset(w => w+1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <MdChevronLeft className="text-lg" />
            </button>
            <span className="font-bold text-gray-700 text-xs sm:text-sm me-1">{weekLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Scope toggle */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setScope("mine")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${scope==="mine" ? "bg-white shadow-sm text-dotan-green-dark" : "text-gray-500"}`}>
                <MdPerson className="text-xs" /> {t.tasks.mineTab}
              </button>
              {isAdmin && (
                <button onClick={() => setScope("all")}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${scope==="all" ? "bg-white shadow-sm text-dotan-green-dark" : "text-gray-500"}`}>
                  <MdPeople className="text-xs" /> {t.tasks.allTab}
                </button>
              )}
            </div>
            {/* View toggle */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView("list")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${view==="list" ? "bg-white shadow-sm" : "text-gray-500"}`}>
                {t.tasks.listView}
              </button>
              <button onClick={() => setView("week")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${view==="week" ? "bg-white shadow-sm" : "text-gray-500"}`}>
                {t.tasks.weekView}
              </button>
            </div>
            {/* Category filter */}
            <div className="flex items-center gap-1">
              <MdFilterList className="text-gray-400 text-sm" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 focus:ring-1 focus:ring-dotan-green">
                <option value="all">{t.common.all}</option>
                {Object.keys(CATEGORY_CONFIG).map(k => <option key={k} value={k}>{categoryLabels[k]}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Week View */}
      {view === "week" ? (
        <TaskWeekView
          tasksByDay={tasksByDay}
          expandedTask={expandedTask}
          onToggle={(id) => setExpandedTask(expandedTask === id ? null : id)}
        />
      ) : (
        /* List View */
        <div className="space-y-2">
          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <MdAssignment className="text-5xl mx-auto mb-4 text-gray-300" />
              <p>{t.tasks.noTasks}</p>
              <p className="text-sm mt-1">{t.tasks.addTaskHint}</p>
            </div>
          )}
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isExpanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              myUserId={myUserId}
              canEdit={canEdit(task)}
              onAction={handleAction}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <TaskLegend />
    </div>
  );
}
