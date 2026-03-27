"use client";

import Link from "next/link";
import { MdSecurity, MdRestaurant, MdAccessTime, MdPeople } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface DutyTablesSectionProps {
  dutyTables: NonNullable<DashboardFeed["nextDutyTables"]>;
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
}

const TYPE_CONFIG: Record<string, { icon: typeof MdSecurity; gradient: string; border: string; badge: string; badgeText: string }> = {
  guard: {
    icon: MdSecurity,
    gradient: "bg-gradient-to-l from-amber-500 to-orange-500",
    border: "border-amber-100",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    badgeText: "text-amber-700",
  },
  obs: {
    icon: MdSecurity,
    gradient: "bg-gradient-to-l from-blue-500 to-indigo-500",
    border: "border-blue-100",
    badge: "bg-blue-50 text-blue-700 border-blue-100",
    badgeText: "text-blue-700",
  },
  kitchen: {
    icon: MdRestaurant,
    gradient: "bg-gradient-to-l from-orange-400 to-red-400",
    border: "border-orange-100",
    badge: "bg-orange-50 text-orange-700 border-orange-100",
    badgeText: "text-orange-700",
  },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.guard;
}

export default function DutyTablesSection({ dutyTables, dateLocale, t }: DutyTablesSectionProps) {
  // Group by date for better display
  const byDate = new Map<string, typeof dutyTables>();
  for (const dt of dutyTables) {
    if (!byDate.has(dt.date)) byDate.set(dt.date, []);
    byDate.get(dt.date)!.push(dt);
  }

  // Prioritize: today first, then upcoming, then recent (most recent first)
  const sortedDates = [...byDate.keys()].sort((a, b) => {
    const aTable = byDate.get(a)![0];
    const bTable = byDate.get(b)![0];
    const order = { today: 0, upcoming: 1, recent: 2 };
    const aOrder = order[aTable.dateStatus] ?? 1;
    const bOrder = order[bTable.dateStatus] ?? 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-2">
      {sortedDates.map(date => {
        const tables = byDate.get(date)!;
        const status = tables[0].dateStatus;
        const isToday = status === "today";
        const isRecent = status === "recent";
        const dateLabel = new Date(date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" });

        return (
          <div key={date} className="space-y-1.5">
            {/* Date header with status badge */}
            <div className="flex items-center gap-2 px-1">
              <span className={`text-[10px] font-bold ${isToday ? "text-green-600" : isRecent ? "text-gray-400" : "text-indigo-500"}`}>
                {dateLabel}
              </span>
              {isToday && (
                <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full animate-pulse">
                  {t.guardDuty.todayLabel || "היום"}
                </span>
              )}
              {!isToday && !isRecent && (
                <span className="text-[9px] font-medium bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full">
                  {t.guardDuty.upcoming || "קרוב"}
                </span>
              )}
            </div>

            {tables.map(dt => {
              const config = getConfig(dt.type);
              const Icon = config.icon;
              const hasMyAssignments = dt.myAssignments.length > 0;

              return (
                <Link
                  key={dt.id}
                  href="/guard-duty"
                  className={`block rounded-2xl border overflow-hidden transition ${config.border} ${
                    isToday ? "ring-2 ring-green-200 shadow-md hover:shadow-lg" : isRecent ? "opacity-70 hover:opacity-100" : "hover:shadow-md"
                  }`}
                >
                  <div className={`px-3.5 py-2 flex items-center gap-2 ${config.gradient}`}>
                    <Icon className="text-sm text-white/90" />
                    <span className="text-[11px] font-bold text-white/90">{dt.title}</span>
                    <div className="mr-auto flex items-center gap-1.5">
                      <span className="text-[9px] text-white/50 flex items-center gap-0.5">
                        <MdPeople className="text-[10px]" /> {dt.totalAssigned}
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 py-2 bg-white">
                    {hasMyAssignments ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dt.myAssignments.map((a, i) => (
                          <span key={i} className={`text-[10px] font-medium px-2 py-1 rounded-lg border ${config.badge}`}>
                            {a.role} · {a.note || a.timeSlot}
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
      })}
    </div>
  );
}
