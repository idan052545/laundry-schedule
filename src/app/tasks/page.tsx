"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdAssignment,
  MdWarning,
  MdNotifications,
  MdCalendarToday,
  MdChevronLeft,
  MdChevronRight,
  MdAccessTime,
  MdFlag,
  MdFilterList,
} from "react-icons/md";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  priority: string;
  recurring: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof MdAssignment }> = {
  deadline: { label: "דדליין", color: "text-red-600", bg: "bg-red-50 border-red-300", icon: MdWarning },
  reminder: { label: "תזכורת", color: "text-amber-600", bg: "bg-amber-50 border-amber-300", icon: MdNotifications },
  task: { label: "משימה", color: "text-dotan-green", bg: "bg-dotan-mint-light border-dotan-green", icon: MdAssignment },
  weekly: { label: "שבועי", color: "text-blue-600", bg: "bg-blue-50 border-blue-300", icon: MdCalendarToday },
  daily: { label: "יומי", color: "text-purple-600", bg: "bg-purple-50 border-purple-300", icon: MdAccessTime },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-400",
  normal: "bg-dotan-green",
  low: "bg-gray-400",
};

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear();
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function getWeekDates(offset: number): { start: Date; end: Date; startStr: string; endStr: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // Sunday = 0
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek + offset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  // Use local date strings to avoid timezone shifts
  const pad = (n: number) => n.toString().padStart(2, "0");
  const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  return { start, end, startStr, endStr };
}

export default function TasksPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"week" | "list">("week");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const { start: weekStart, end: weekEnd, startStr: weekStartStr, endStr: weekEndStr } = getWeekDates(weekOffset);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const from = `${weekStartStr}T00:00:00`;
    const to = `${weekEndStr}T23:59:59`;
    const catParam = categoryFilter !== "all" ? `&category=${categoryFilter}` : "";
    const res = await fetch(`/api/tasks?from=${from}&to=${to}${catParam}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, [weekStartStr, weekEndStr, categoryFilter]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchTasks();
  }, [status, router, fetchTasks]);

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  // Group tasks by day for week view
  const tasksByDay: Record<string, Task[]> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = d.toISOString().split("T")[0];
    tasksByDay[key] = [];
  }
  tasks.forEach((task) => {
    const key = new Date(task.startDate).toISOString().split("T")[0];
    if (tasksByDay[key]) tasksByDay[key].push(task);
  });

  // Today's urgent items
  const todayTasks = tasks.filter((t) => isToday(t.startDate));
  const urgentTasks = tasks.filter((t) => (t.priority === "urgent" || t.priority === "high") && !isPast(t.startDate));
  const tomorrowTasks = tasks.filter((t) => isTomorrow(t.startDate));

  const weekLabel = `${weekStart.getDate()} ${MONTHS_HE[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTHS_HE[weekEnd.getMonth()]}`;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-4 sm:mb-6 flex items-center gap-3">
        <MdAssignment className="text-dotan-green" />
        לוח משימות
      </h1>

      {/* Alerts Banner */}
      {urgentTasks.length > 0 && (
        <div className="bg-gradient-to-l from-red-50 to-amber-50 p-3 sm:p-4 rounded-xl border-2 border-red-300 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-red-600 mb-2 sm:mb-3 flex items-center gap-2">
            <MdWarning className="animate-pulse" /> התראות ודדליינים קרובים
          </h2>
          <div className="space-y-2">
            {urgentTasks.slice(0, 5).map((task) => {
              const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
              return (
                <div key={task.id} className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-lg shadow-sm border border-red-200">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                  <config.icon className={`${config.color} text-lg shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 block truncate">{task.title}</span>
                    <span className="text-xs text-gray-500">
                      {isToday(task.startDate) ? "היום" : isTomorrow(task.startDate) ? "מחר" : formatDate(task.startDate)}
                      {!task.allDay && ` ${formatTime(task.startDate)}`}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${config.bg} ${config.color} border font-medium`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today Summary */}
      {todayTasks.length > 0 && (
        <div className="bg-dotan-mint-light p-3 sm:p-4 rounded-xl border border-dotan-mint mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-dotan-green-dark mb-2 flex items-center gap-2">
            <MdCalendarToday /> היום ({todayTasks.length} משימות)
          </h2>
          <div className="flex flex-wrap gap-2">
            {todayTasks.map((task) => {
              const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
              return (
                <div key={task.id} className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border ${config.bg} ${config.color} font-medium`}>
                  {!task.allDay && <span className="ml-1 opacity-70">{formatTime(task.startDate)}</span>}
                  {task.title}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
              <MdChevronRight className="text-xl" />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-dotan-mint-light hover:bg-dotan-mint transition">
              היום
            </button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
              <MdChevronLeft className="text-xl" />
            </button>
            <span className="font-bold text-gray-700 text-sm sm:text-base mr-2">{weekLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              <button onClick={() => setView("week")}
                className={`px-3 py-1.5 rounded-lg text-sm transition font-medium ${view === "week" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                שבוע
              </button>
              <button onClick={() => setView("list")}
                className={`px-3 py-1.5 rounded-lg text-sm transition font-medium ${view === "list" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                רשימה
              </button>
            </div>
            <div className="flex items-center gap-1">
              <MdFilterList className="text-gray-500" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-dotan-green">
                <option value="all">הכל</option>
                <option value="task">משימות</option>
                <option value="deadline">דדליינים</option>
                <option value="reminder">תזכורות</option>
                <option value="weekly">שבועי</option>
                <option value="daily">יומי</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Week View */}
      {view === "week" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 sm:gap-3">
          {Object.entries(tasksByDay).map(([dateKey, dayTasks]) => {
            const d = new Date(dateKey + "T12:00:00");
            const dayIndex = d.getDay();
            const today = isToday(dateKey + "T12:00:00");

            return (
              <div key={dateKey} className={`bg-white rounded-xl border overflow-hidden ${today ? "border-dotan-gold border-2 shadow-md" : "border-gray-200"}`}>
                <div className={`px-3 py-2 text-center ${today ? "bg-dotan-gold text-dotan-green-dark" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-500 font-medium">{DAYS_HE[dayIndex]}</div>
                  <div className={`text-lg font-bold ${today ? "text-dotan-green-dark" : "text-gray-800"}`}>{d.getDate()}</div>
                </div>
                <div className="p-2 space-y-1.5 min-h-[80px] sm:min-h-[120px]">
                  {dayTasks.length === 0 && (
                    <div className="text-xs text-gray-300 text-center py-4">אין משימות</div>
                  )}
                  {dayTasks.map((task) => {
                    const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
                    const isExpanded = expandedTask === task.id;
                    return (
                      <button key={task.id}
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        className={`w-full text-right p-1.5 sm:p-2 rounded-lg border transition text-xs ${config.bg} hover:shadow-sm`}>
                        <div className="flex items-start gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{task.title}</div>
                            {!task.allDay && (
                              <div className="text-[10px] opacity-60 mt-0.5">{formatTime(task.startDate)}</div>
                            )}
                            {isExpanded && task.description && (
                              <div className="mt-1 text-[11px] text-gray-600 whitespace-pre-wrap">{task.description}</div>
                            )}
                          </div>
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
            </div>
          )}
          {tasks.map((task) => {
            const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
            const IconComp = config.icon;
            const isExpanded = expandedTask === task.id;
            const past = isPast(task.startDate);

            return (
              <button key={task.id}
                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                className={`w-full text-right bg-white p-3 sm:p-4 rounded-xl border-2 transition hover:shadow-sm ${past ? "opacity-60 border-gray-200" : config.bg}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                  <IconComp className={`text-xl shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm sm:text-base truncate">{task.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isToday(task.startDate) ? "היום" : isTomorrow(task.startDate) ? "מחר" : formatDate(task.startDate)}
                      {!task.allDay && ` | ${formatTime(task.startDate)}`}
                      {task.endDate && !task.allDay && ` - ${formatTime(task.endDate)}`}
                    </div>
                    {isExpanded && task.description && (
                      <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-2">{task.description}</div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tomorrow preview */}
      {tomorrowTasks.length > 0 && weekOffset === 0 && (
        <div className="mt-4 sm:mt-6 bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-200">
          <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
            <MdNotifications /> מחר ({tomorrowTasks.length} משימות)
          </h3>
          <div className="flex flex-wrap gap-2">
            {tomorrowTasks.map((task) => (
              <span key={task.id} className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-700">
                {task.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1"><MdFlag className="text-red-500" /> דחוף</div>
        <div className="flex items-center gap-1"><MdFlag className="text-orange-400" /> חשוב</div>
        <div className="flex items-center gap-1"><MdFlag className="text-dotan-green" /> רגיל</div>
        {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon, color }]) => (
          <div key={key} className="flex items-center gap-1"><Icon className={color} /> {label}</div>
        ))}
      </div>
    </div>
  );
}
