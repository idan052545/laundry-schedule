"use client";

import { MdFileDownload } from "react-icons/md";
import { useEffect } from "react";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";
import { TEAM_COLORS } from "./constants";
import type { StatsData } from "./types";

interface StatsTabProps {
  stats: StatsData | null;
  statsPeriod: string;
  setStatsPeriod: (p: string) => void;
  exportStats: () => void;
}

export default function StatsTab({ stats, statsPeriod, setStatsPeriod, exportStats }: StatsTabProps) {
  const { t, locale } = useLanguage();  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {["day", "week", "month"].map(p => (
          <button key={p} onClick={() => setStatsPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statsPeriod === p ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            {p === "day" ? t.volunteers.daily : p === "week" ? t.volunteers.weekly : t.volunteers.monthly}
          </button>
        ))}
        <button onClick={exportStats} disabled={!stats}
          className="mr-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition disabled:opacity-50">
          <MdFileDownload className="text-sm" /> {t.volunteers.exportBtn}
        </button>
      </div>

      {stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
              <div className="text-2xl font-black text-green-700">{stats.totalAssignments}</div>
              <div className="text-[10px] text-green-600 font-medium">{t.volunteers.totalAssignments}</div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
              <div className="text-2xl font-black text-blue-700">{stats.leaderboard.length}</div>
              <div className="text-[10px] text-blue-600 font-medium">{t.volunteers.volunteersCount}</div>
            </div>
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-3 text-center">
              <div className="text-2xl font-black text-purple-700">{stats.averageRating?.toFixed(1) || "—"}</div>
              <div className="text-[10px] text-purple-600 font-medium">{t.volunteers.avgRating}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">{t.volunteers.teamDistribution}</h3>
            <div className="space-y-2">
              {Object.entries(stats.teamTotals).sort(([, a], [, b]) => b.count - a.count).map(([team, data]) => {
                const maxCount = Math.max(...Object.values(stats.teamTotals).map(d => d.count));
                const pct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                return (
                  <div key={team} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-16 shrink-0 px-2 py-0.5 rounded text-center border ${TEAM_COLORS[parseInt(team)] || TEAM_COLORS[0]}`}>
                      {parseInt(team) === 0 ? t.teams.other : `${t.common.team} ${team}`}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-8 text-center">{data.count}</span>
                    <span className="text-[10px] text-gray-400 w-14 text-end">{(data.minutes / 60).toFixed(1)} {t.volunteers.hoursLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">{t.volunteers.topVolunteers}</h3>
            <div className="space-y-2">
              {stats.leaderboard.slice(0, 15).map((u, idx) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-6 text-center ${idx < 3 ? "text-amber-500" : "text-gray-400"}`}>
                    {idx + 1}
                  </span>
                  <Avatar name={u.name} image={u.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{displayName(u, locale)}</div>
                    <div className="text-[10px] text-gray-400">{u.count} {t.volunteers.duties} · {(u.totalMinutes / 60).toFixed(1)} {t.volunteers.hoursLabel}</div>
                  </div>
                  {u.team && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TEAM_COLORS[u.team] || TEAM_COLORS[0]}`}>
                      {u.team}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <InlineLoading />
      )}
    </div>
  );
}
