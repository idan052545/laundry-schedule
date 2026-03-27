"use client";

import Link from "next/link";
import {
  MdVolunteerActivism, MdAccessTime, MdLocationOn, MdPeople,
  MdNotificationsActive,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface CreatedRequestsSectionProps {
  myCreatedRequests: NonNullable<DashboardFeed["myCreatedRequests"]>;
  locale: string;
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
  onRemindVolunteer?: (requestId: string) => void;
}

export default function CreatedRequestsSection({ myCreatedRequests, locale, dateLocale, t, onRemindVolunteer }: CreatedRequestsSectionProps) {
  return (
    <div className="space-y-2">
      {myCreatedRequests.map(r => {
        const fmtT = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        const isNow = new Date() >= new Date(r.startTime) && new Date() <= new Date(r.endTime);
        const filled = r.assignments?.length ?? r._count.assignments;
        const slotsLeft = r.requiredCount - filled;
        return (
          <div key={r.id} className={`rounded-2xl border-2 p-3 transition ${isNow ? "border-teal-300 bg-teal-50/50" : "border-teal-200 bg-teal-50/20"}`}>
            <div className="flex items-center justify-between mb-1.5">
              <Link href="/volunteers" className="flex items-center gap-2 min-w-0">
                <MdVolunteerActivism className={`text-lg ${isNow ? "text-teal-600" : "text-teal-500"}`} />
                <span className="text-sm font-bold text-gray-800 truncate">{r.title}</span>
                {isNow && <span className="text-[9px] px-1.5 py-0.5 bg-teal-200 text-teal-800 rounded font-bold shrink-0">{t.common.now}</span>}
              </Link>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slotsLeft > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {filled}/{r.requiredCount}
                </span>
                {onRemindVolunteer && filled > 0 && (
                  <button onClick={() => onRemindVolunteer(r.id)}
                    className="p-1 rounded-lg border border-purple-200 text-purple-500 hover:bg-purple-50 transition"
                    title={t.volunteers.remindBtn}>
                    <MdNotificationsActive className="text-sm" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-1.5">
              <span className="flex items-center gap-0.5"><MdAccessTime className="text-xs" /> {fmtT(r.startTime)}–{fmtT(r.endTime)}</span>
              {r.location && (
                <span className="flex items-center gap-0.5 text-orange-600"><MdLocationOn className="text-xs" /> {r.location}</span>
              )}
            </div>
            {/* Assigned members */}
            {(r.assignments?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <MdPeople className="text-xs text-gray-400" />
                {r.assignments!.map(a => (
                  <div key={a.userId} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                    a.assignmentType === "commander" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-gray-100 text-gray-600"
                  }`}>
                    <Avatar name={a.user.name} image={a.user.image || null} size="xs" />
                    <span>{displayName(a.user, locale)}</span>
                  </div>
                ))}
                {slotsLeft > 0 && (
                  <Link href="/volunteers" className="text-[10px] text-teal-600 font-medium hover:underline">
                    +{slotsLeft} {t.volunteers.assign}
                  </Link>
                )}
              </div>
            )}
            {filled === 0 && (
              <Link href="/volunteers" className="text-[10px] text-amber-600 font-medium hover:underline">
                {t.volunteers.assign} →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
