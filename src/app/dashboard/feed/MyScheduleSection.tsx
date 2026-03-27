"use client";

import Link from "next/link";
import { MdCalendarMonth } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface MyScheduleSectionProps {
  myAssignedSchedule: NonNullable<DashboardFeed["myAssignedSchedule"]>;
  myTeamAssignments: DashboardFeed["myTeamAssignments"];
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function MyScheduleSection({ myAssignedSchedule, myTeamAssignments, dateLocale, t, getTranslation }: MyScheduleSectionProps) {
  const teamIds = new Set((myTeamAssignments || []).map((e: { id: string }) => e.id));
  const myUniqueEvents = (myAssignedSchedule || []).filter((e: { id: string }) => !teamIds.has(e.id));
  if (myUniqueEvents.length === 0) return null;

  return (
    <Link href="/schedule-daily" className="block rounded-2xl overflow-hidden border border-indigo-100 hover:shadow-md transition">
      <div className="bg-gradient-to-l from-indigo-500 to-violet-500 px-3.5 py-2.5 flex items-center gap-2">
        <MdCalendarMonth className="text-base text-white/90" />
        <span className="text-[12px] font-bold text-white">{t.dashboard.sectionMySchedule}</span>
        <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold mr-auto">{myUniqueEvents.length}</span>
      </div>
      <div className="px-3 py-2.5 bg-gradient-to-br from-indigo-50/40 to-white space-y-1.5">
        {myUniqueEvents.map((e) => {
          const isPassed = !e.allDay && new Date(e.endTime) < new Date();
          const isNow = !e.allDay && new Date(e.startTime) <= new Date() && new Date(e.endTime) > new Date();
          return (
            <div key={e.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border shadow-sm transition ${
              isPassed ? "bg-gray-50 border-gray-200 opacity-50" : isNow ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200" : "bg-white border-indigo-100"
            }`}>
              <span className={`text-[11px] font-bold tabular-nums shrink-0 w-12 text-center ${isPassed ? "text-gray-400 line-through" : isNow ? "text-indigo-600" : "text-indigo-400"}`} dir="ltr">
                {e.allDay ? t.common.allDay : new Date(e.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </span>
              <div className={`w-px h-5 rounded-full ${isPassed ? "bg-gray-200" : "bg-indigo-200"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-semibold truncate block ${isPassed ? "text-gray-400 line-through" : "text-gray-800"}`}>{getTranslation(e.title)}</span>
                {!e.allDay && !isPassed && (
                  <span className="text-[10px] text-gray-400" dir="ltr">
                    {new Date(e.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                    {" – "}
                    {new Date(e.endTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                  </span>
                )}
              </div>
              {isPassed && <span className="text-[8px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-full font-bold shrink-0">{t.common.passed}</span>}
              {isNow && (
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full text-[8px] font-bold animate-pulse shrink-0">
                  {t.common.now}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Link>
  );
}
