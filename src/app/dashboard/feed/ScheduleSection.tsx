"use client";

import Link from "next/link";
import { MdCalendarMonth } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface ScheduleSectionProps {
  scheduleItems: DashboardFeed["scheduleItems"];
  allDaySchedule: DashboardFeed["allDaySchedule"];
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function ScheduleSection({ scheduleItems, allDaySchedule, dateLocale, t, getTranslation }: ScheduleSectionProps) {
  return (
    <Link href="/schedule-daily" className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition">
      <div className="bg-gradient-to-l from-emerald-500 to-dotan-green px-3.5 py-2 flex items-center gap-2">
        <MdCalendarMonth className="text-sm text-white/90" />
        <span className="text-[11px] font-bold text-white/90">{t.dashboard.dailySchedule}</span>
        {scheduleItems?.some(s => s.status === "now") && (
          <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold mr-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> {t.common.now}
          </span>
        )}
      </div>
      <div className="px-3.5 py-2.5 space-y-1.5">
        {(scheduleItems || []).map((ev) => {
          const isNow = ev.status === "now";
          return (
            <div key={ev.id} className={`flex items-center gap-2.5 ${!isNow ? "opacity-60" : ""}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${isNow ? "bg-green-500 animate-pulse ring-4 ring-green-100" : "bg-gray-300"}`} />
              <span className="text-[11px] font-bold text-gray-500 tabular-nums shrink-0 w-[90px]" dir="ltr">
                {new Date(ev.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                {" – "}
                {new Date(ev.endTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate">{getTranslation(ev.title)}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${ev.target === "all" ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"}`}>
                {ev.target === "all" ? t.schedule.platoon : t.common.team}
              </span>
              {ev.assignees?.length > 0 && <span className="text-[8px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">{t.schedule.forYou}</span>}
            </div>
          );
        })}
        {allDaySchedule.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-50">
            {allDaySchedule.map((e) => (
              <span key={e.id} className={`text-[10px] px-2 py-0.5 rounded-full border ${e.target === "all" ? "bg-gray-50 text-gray-600 border-gray-100" : "bg-cyan-50 text-cyan-700 border-cyan-100"}`}>
                {e.target !== "all" && <span className="font-bold ms-0.5">{t.common.team}</span>}
                {getTranslation(e.title)}
                {e.assignees?.length > 0 && <span className="text-teal-600 font-bold me-0.5"> ⭐</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
