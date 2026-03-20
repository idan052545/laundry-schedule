"use client";

import { MdWarning, MdNotifications } from "react-icons/md";
import { PRIORITY_CONFIG } from "./constants";
import { formatDate, daysUntil } from "./utils";
import { Task } from "./types";

interface TaskAlertsProps {
  overdueTasks: Task[];
  dueSoonTasks: Task[];
}

export default function TaskAlerts({ overdueTasks, dueSoonTasks }: TaskAlertsProps) {
  if (overdueTasks.length === 0 && dueSoonTasks.length === 0) return null;

  return (
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
  );
}
