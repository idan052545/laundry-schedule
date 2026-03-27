"use client";

import Link from "next/link";
import {
  MdVolunteerActivism, MdAccessTime, MdLocationOn, MdPeople,
  MdCalendarMonth, MdWarning,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface VolunteerAssignmentsSectionProps {
  myVolunteerAssignments: NonNullable<DashboardFeed["myVolunteerAssignments"]>;
  dateLocale: string;
  locale: string;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function VolunteerAssignmentsSection({ myVolunteerAssignments, dateLocale, locale, t }: VolunteerAssignmentsSectionProps) {
  return (
    <div className="space-y-2">
      {myVolunteerAssignments.map(a => {
        const fmtT = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        const isNow = new Date() >= new Date(a.request.startTime) && new Date() <= new Date(a.request.endTime);
        const teammates = (a.request.assignments || []).filter(m => m.userId !== myVolunteerAssignments?.[0]?.id?.slice(0, 0) /* always true */ );
        return (
          <Link key={a.id} href="/volunteers?tab=my" className={`block rounded-2xl border-2 p-3 transition hover:shadow-md ${isNow ? "border-emerald-300 bg-emerald-50/50" : "border-emerald-200 bg-emerald-50/30"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <MdVolunteerActivism className={`text-lg ${isNow ? "text-emerald-600" : "text-emerald-500"}`} />
              <span className="text-sm font-bold text-gray-800">{a.request.title}</span>
              {isNow && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded font-bold">{t.common.now}</span>}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-1.5">
              <span className="flex items-center gap-0.5"><MdAccessTime className="text-xs" /> {fmtT(a.request.startTime)}–{fmtT(a.request.endTime)}</span>
              {a.request.location && (
                <span className="flex items-center gap-0.5 text-orange-600"><MdLocationOn className="text-xs" /> {a.request.location}</span>
              )}
            </div>
            {/* Team members */}
            {teammates.length > 1 && (
              <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                <MdPeople className="text-xs text-gray-400" />
                {teammates.map(m => (
                  <div key={m.userId} className="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-gray-100 text-[10px] text-gray-600">
                    <Avatar name={m.user.name} image={m.user.image || null} size="xs" />
                    <span>{displayName(m.user, locale)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Schedule conflicts — what you'll miss */}
            {a.overlappingSchedule && a.overlappingSchedule.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 mb-0.5">
                  <MdWarning className="text-xs" /> {t.dashboard.youWillMiss}
                </div>
                {a.overlappingSchedule.map(ev => (
                  <div key={ev.id} className="text-[10px] text-amber-600 flex items-center gap-1">
                    <MdCalendarMonth className="text-[10px]" />
                    <span>{ev.title}</span>
                    <span className="text-amber-400">{fmtT(ev.startTime)}–{fmtT(ev.endTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
