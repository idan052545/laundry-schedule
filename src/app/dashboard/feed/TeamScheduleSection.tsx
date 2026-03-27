"use client";

import Link from "next/link";
import { MdCalendarMonth } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface TeamScheduleSectionProps {
  myTeamAssignments: NonNullable<DashboardFeed["myTeamAssignments"]>;
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function TeamScheduleSection({ myTeamAssignments, dateLocale, t, getTranslation }: TeamScheduleSectionProps) {
  return (
    <Link href="/schedule-daily" className="block rounded-2xl overflow-hidden border border-teal-100 hover:shadow-md transition">
      <div className="bg-gradient-to-l from-teal-500 to-cyan-500 px-3.5 py-2 flex items-center gap-2">
        <MdCalendarMonth className="text-sm text-white/90" />
        <span className="text-[11px] font-bold text-white/90">{t.dashboard.sectionTeamSchedule} — {t.schedule.forYou}</span>
        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold mr-auto">{myTeamAssignments.length}</span>
      </div>
      <div className="px-3 py-2.5 bg-gradient-to-br from-teal-50/50 to-white space-y-1.5">
        {myTeamAssignments.map((e) => {
          const isPassed = !e.allDay && new Date(e.endTime) < new Date();
          const isNow = !e.allDay && new Date(e.startTime) <= new Date() && new Date(e.endTime) > new Date();
          return (
            <div key={e.id} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 border shadow-sm ${
              isPassed ? "bg-gray-50 border-gray-200 opacity-50" : isNow ? "bg-teal-50 border-teal-300 ring-1 ring-teal-200" : "bg-white border-teal-100"
            }`}>
              <span className={`text-[11px] font-bold tabular-nums shrink-0 w-12 text-center ${isPassed ? "text-gray-400 line-through" : isNow ? "text-teal-700" : "text-teal-600"}`} dir="ltr">
                {e.allDay ? t.common.allDay : new Date(e.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </span>
              <div className={`w-px h-4 ${isPassed ? "bg-gray-200" : "bg-teal-200"}`} />
              <span className={`text-xs font-medium truncate ${isPassed ? "text-gray-400 line-through" : "text-gray-800"}`}>{getTranslation(e.title)}</span>
              {isPassed && <span className="text-[8px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-full font-bold shrink-0">{t.common.passed}</span>}
              {isNow && <span className="text-[8px] px-1.5 py-0.5 bg-teal-500 text-white rounded-full font-bold animate-pulse shrink-0">{t.common.now}</span>}
            </div>
          );
        })}
      </div>
    </Link>
  );
}
