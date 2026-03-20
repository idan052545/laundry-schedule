"use client";

import { MdWarning, MdNotifications } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { PRIORITY_CONFIG } from "./constants";
import { formatDate, daysUntil } from "./utils";
import { Task } from "./types";
import { getMonthsArray } from "./constants";

interface TaskAlertsProps {
  overdueTasks: Task[];
  dueSoonTasks: Task[];
}

export default function TaskAlerts({ overdueTasks, dueSoonTasks }: TaskAlertsProps) {
  const { t } = useLanguage();
  const months = getMonthsArray(t);

  if (overdueTasks.length === 0 && dueSoonTasks.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
          <div className="text-sm font-bold text-red-600 flex items-center gap-1.5 mb-1.5">
            <MdWarning className="animate-pulse" /> {t.tasks.overdueTasks.replace("{n}", String(overdueTasks.length))}
          </div>
          <div className="space-y-1">
            {overdueTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[task.priority].dot}`} />
                <span className="font-medium text-gray-800 truncate flex-1">{task.title}</span>
                <span className="text-red-500 font-bold shrink-0">
                  {t.tasks.dueOn.replace("{date}", formatDate(task.dueDate!, months))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {dueSoonTasks.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
          <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5 mb-1.5">
            <MdNotifications /> {t.tasks.upcomingTasks.replace("{n}", String(dueSoonTasks.length))}
          </div>
          <div className="space-y-1">
            {dueSoonTasks.map(task => {
              const days = daysUntil(task.dueDate!);
              return (
                <div key={task.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[task.priority].dot}`} />
                  <span className="font-medium text-gray-800 truncate flex-1">{task.title}</span>
                  <span className="text-amber-600 font-bold shrink-0">
                    {days === 0 ? t.tasks.dueToday : days === 1 ? t.tasks.dueTomorrow : t.tasks.inDays.replace("{n}", String(days))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
