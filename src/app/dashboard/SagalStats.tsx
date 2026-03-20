"use client";

import {
  MdVisibility, MdVolunteerActivism, MdPeople, MdWarning,
  MdAccessTime, MdSchedule, MdRestaurant, MdCleaningServices,
  MdSecurity, MdLocalShipping, MdMoreHoriz,
} from "react-icons/md";
import type { DashboardFeed } from "./types";

interface SagalStatsProps {
  feed: DashboardFeed;
}

export default function SagalStats({ feed }: SagalStatsProps) {
  const reqs = feed.activeVolunteerRequests || [];
  const nowMs = Date.now();
  const totalActive = reqs.length;
  const urgentReqs = reqs.filter(r => r.priority === "urgent").length;
  const happeningNow = reqs.filter(r => {
    const s = new Date(r.startTime).getTime();
    const e = new Date(r.endTime).getTime();
    return nowMs >= s && nowMs <= e;
  }).length;
  const filledSlots = reqs.reduce((sum, r) => sum + r._count.assignments, 0);
  const totalRequired = reqs.reduce((sum, r) => sum + r.requiredCount, 0);
  const fillPct = totalRequired > 0 ? Math.round((filledSlots / totalRequired) * 100) : 0;
  const catConfig = [
    { key: "kitchen", label: "מטבח", icon: MdRestaurant, color: "text-orange-500" },
    { key: "cleaning", label: "ניקיון", icon: MdCleaningServices, color: "text-blue-500" },
    { key: "guard", label: "שמירה", icon: MdSecurity, color: "text-red-500" },
    { key: "logistics", label: "לוגיסטיקה", icon: MdLocalShipping, color: "text-purple-500" },
    { key: "general", label: "כללי", icon: MdVolunteerActivism, color: "text-green-500" },
    { key: "other", label: "אחר", icon: MdMoreHoriz, color: "text-gray-500" },
  ];
  const catCounts = catConfig.map(c => ({ ...c, count: reqs.filter(r => r.category === c.key).length }));

  return (
    <div className="mb-4 space-y-3">
      {/* Banner */}
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
        <MdVisibility className="text-indigo-500 shrink-0" />
        <span className="text-xs font-bold text-indigo-700">סגל מפקד — צפייה בלבד</span>
      </div>

      {/* Stats card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <MdVolunteerActivism className="text-base text-indigo-500" /> סטטיסטיקת התנדבויות
        </h3>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-indigo-50 rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-bold text-indigo-700">{totalActive}</div>
            <div className="text-[10px] text-indigo-500 font-medium flex items-center justify-center gap-0.5"><MdPeople className="text-xs" /> בקשות פעילות</div>
          </div>
          <div className="bg-red-50 rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-bold text-red-600">{urgentReqs}</div>
            <div className="text-[10px] text-red-500 font-medium flex items-center justify-center gap-0.5"><MdWarning className="text-xs" /> דחופות</div>
          </div>
          <div className="bg-green-50 rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-bold text-green-700">{happeningNow}</div>
            <div className="text-[10px] text-green-500 font-medium flex items-center justify-center gap-0.5"><MdAccessTime className="text-xs" /> מתבצעות עכשיו</div>
          </div>
          <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-bold text-amber-700">{filledSlots}/{totalRequired}</div>
            <div className="text-[10px] text-amber-500 font-medium flex items-center justify-center gap-0.5"><MdSchedule className="text-xs" /> משבצות מאוישות</div>
          </div>
        </div>

        {/* Fill bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-medium">אחוז איוש כולל</span>
            <span className="text-[10px] font-bold text-gray-600">{fillPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillPct >= 80 ? "bg-green-500" : fillPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Category breakdown */}
        <div>
          <span className="text-[10px] text-gray-400 font-medium block mb-1.5">פילוח לפי קטגוריה</span>
          <div className="flex flex-wrap gap-2">
            {catCounts.map(c => {
              const CatIcon = c.icon;
              return (
                <div key={c.key} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                  <CatIcon className={`text-sm ${c.color}`} />
                  <span className="text-[10px] font-medium text-gray-600">{c.label}</span>
                  <span className={`text-[10px] font-bold ${c.count > 0 ? "text-gray-800" : "text-gray-300"}`}>{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
