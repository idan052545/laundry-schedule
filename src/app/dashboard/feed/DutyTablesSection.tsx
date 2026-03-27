"use client";

import Link from "next/link";
import { MdSecurity } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface DutyTablesSectionProps {
  dutyTables: NonNullable<DashboardFeed["nextDutyTables"]>;
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function DutyTablesSection({ dutyTables, dateLocale, t }: DutyTablesSectionProps) {
  return (
    <div className="space-y-2">
      {dutyTables.map(dt => {
        const isObs = dt.type === "obs";
        return (
          <Link key={dt.id} href="/guard-duty" className={`block rounded-2xl border overflow-hidden hover:shadow-md transition ${
            isObs ? "border-blue-100" : "border-amber-100"
          }`}>
            <div className={`px-3.5 py-2 flex items-center gap-2 ${isObs ? "bg-gradient-to-l from-blue-500 to-indigo-500" : "bg-gradient-to-l from-amber-500 to-orange-500"}`}>
              <MdSecurity className="text-sm text-white/90" />
              <span className="text-[11px] font-bold text-white/90">{dt.title}</span>
              <span className="text-[10px] text-white/60 mr-auto">
                {new Date(dt.date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="px-3.5 py-2 bg-white">
              {dt.myAssignments.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {dt.myAssignments.map((a, i) => (
                    <span key={i} className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                      isObs ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {a.role} · {a.timeSlot}
                      {a.partners.length > 0 && <span className="font-normal opacity-70"> ({a.partners.join(", ")})</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-gray-400">{t.guardDuty.noAssignment}</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
