"use client";

import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, getCategoryLabels, PRIORITY_CONFIG, getDaysArray } from "./constants";
import { TODAY_KEY } from "./utils";
import { Task } from "./types";

interface TaskWeekViewProps {
  tasksByDay: Record<string, Task[]>;
  expandedTask: string | null;
  onToggle: (id: string) => void;
}

export default function TaskWeekView({ tasksByDay, expandedTask, onToggle }: TaskWeekViewProps) {
  const { t } = useLanguage();
  const categoryLabels = getCategoryLabels(t);
  const daysArray = getDaysArray(t);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
      {Object.entries(tasksByDay).map(([dateKey, dayTasks]) => {
        const d = new Date(dateKey + "T12:00:00");
        const today = dateKey === TODAY_KEY;
        return (
          <div key={dateKey} className={`bg-white rounded-xl border overflow-hidden ${today ? "border-dotan-gold border-2 shadow-md" : "border-gray-200"}`}>
            <div className={`px-2 py-1.5 text-center ${today ? "bg-dotan-gold text-dotan-green-dark" : "bg-gray-50"}`}>
              <div className="text-[10px] text-gray-500 font-medium">{daysArray[d.getDay()]}</div>
              <div className={`text-base font-bold ${today ? "text-dotan-green-dark" : "text-gray-800"}`}>{d.getDate()}</div>
            </div>
            <div className="p-1.5 space-y-1 min-h-[60px]">
              {dayTasks.length === 0 && <div className="text-[10px] text-gray-300 text-center py-3">—</div>}
              {dayTasks.map(task => {
                const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
                return (
                  <button key={task.id} onClick={() => onToggle(task.id)}
                    className={`w-full text-start p-1.5 rounded-lg border text-[11px] transition ${task.status==="done" ? "bg-gray-50 border-gray-200 opacity-60 line-through" : `${config.bg} ${config.border}`}`}>
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
  );
}
