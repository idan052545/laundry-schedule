"use client";

import Link from "next/link";
import { MdAssignment } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface TasksSectionProps {
  todayTasks: DashboardFeed["todayTasks"];
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function TasksSection({ todayTasks, t, getTranslation }: TasksSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-l from-purple-500 to-indigo-500 px-3.5 py-2 flex items-center gap-2">
        <MdAssignment className="text-sm text-white/90" />
        <span className="text-[11px] font-bold text-white/90">{t.dashboard.tasks} ({todayTasks.length})</span>
      </div>
      <div className="px-3.5 py-2.5 space-y-1.5">
        {todayTasks.slice(0, 4).map((task) => {
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
          return (
            <Link key={task.id} href="/tasks" className="flex items-center gap-2 group">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                task.priority === "urgent" ? "bg-red-500" : task.priority === "high" ? "bg-orange-400" : "bg-gray-300"
              }`} />
              <span className={`text-xs truncate flex-1 group-hover:underline ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>{getTranslation(task.title)}</span>
              {isOverdue && <span className="text-[9px] text-red-500 font-bold shrink-0">{t.tasks.completed}</span>}
            </Link>
          );
        })}
        {todayTasks.length > 4 && (
          <Link href="/tasks" className="text-[10px] text-purple-500 hover:underline block">+ {todayTasks.length - 4}</Link>
        )}
      </div>
    </div>
  );
}
