"use client";

import Link from "next/link";
import {
  MdWarning, MdVolunteerActivism, MdAccessTime, MdSchedule,
  MdPeople, MdChevronLeft,
} from "react-icons/md";
import type { DashboardFeed } from "./types";

interface VolunteerAlertsProps {
  feed: DashboardFeed;
}

export default function VolunteerAlerts({ feed }: VolunteerAlertsProps) {
  const nowMs = Date.now();
  const hourFromNow = nowMs + 60 * 60 * 1000;
  const reqs = feed.activeVolunteerRequests || [];
  const urgent = reqs.filter(r => r.priority === "urgent");
  const now = reqs.filter(r => {
    const s = new Date(r.startTime).getTime();
    const e = new Date(r.endTime).getTime();
    return nowMs >= s && nowMs <= e && r.priority !== "urgent";
  });
  const soon = reqs.filter(r => {
    const s = new Date(r.startTime).getTime();
    return s > nowMs && s <= hourFromNow && r.priority !== "urgent";
  });
  const myCreatedAlerts = (feed.myCreatedRequests || []).map(r => {
    const filled = r._count.assignments;
    const s = new Date(r.startTime).getTime();
    const e = new Date(r.endTime).getTime();
    const isNow = nowMs >= s && nowMs <= e;
    const isSoon = s > nowMs && s <= hourFromNow;
    const needsMore = filled < r.requiredCount;
    return { ...r, filled, isNow, isSoon, needsMore };
  });

  const hasVolAlerts = urgent.length > 0 || now.length > 0 || soon.length > 0 || feed?.urgentReplacement;
  const hasMyCreatedAlerts = myCreatedAlerts.some(r => r.needsMore || r.isNow || r.isSoon);

  if (!hasVolAlerts && !hasMyCreatedAlerts) return null;

  return (
    <div className="mb-3 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Urgent replacement — red strip */}
      {feed?.urgentReplacement && (
        <Link href={`/volunteers?highlight=${feed.urgentReplacement.request.id}`}
          className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border-b border-red-100 hover:bg-red-100/60 transition">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <MdWarning className="text-red-500 text-base shrink-0" />
          <p className="text-xs font-bold text-red-700 flex-1 truncate">דרוש/ה מחליף/ה — {feed.urgentReplacement.request.title}</p>
          <MdChevronLeft className="text-red-400 shrink-0" />
        </Link>
      )}

      {/* Urgent requests */}
      {urgent.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = r.requiredCount - filled;
        const timeStr = new Date(r.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        return (
          <Link key={r.id} href="/volunteers"
            className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-red-100 bg-red-50/50 hover:bg-red-50 transition">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <MdVolunteerActivism className="text-red-500 text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{r.title} <span className="text-red-500 font-black">דחוף</span></p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <MdAccessTime className="text-[10px]" />{timeStr}
                <span className="text-red-600 font-bold">חסרים {slotsLeft}</span>
              </p>
            </div>
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </Link>
        );
      })}

      {/* Happening NOW */}
      {now.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = Math.max(0, r.requiredCount - filled);
        const endStr = new Date(r.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        return (
          <Link key={r.id} href="/volunteers"
            className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-green-100 bg-green-50/50 hover:bg-green-50 transition">
            <span className="relative shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 block" />
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </span>
            <MdVolunteerActivism className="text-green-600 text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">עכשיו</span>
              </div>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <span>עד {endStr}</span>
                <span className="font-semibold text-gray-600">{filled}/{r.requiredCount}</span>
                {slotsLeft > 0 && <span className="text-amber-600 font-bold">חסרים {slotsLeft}</span>}
              </p>
            </div>
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </Link>
        );
      })}

      {/* Starting soon */}
      {soon.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = Math.max(0, r.requiredCount - filled);
        const startStr = new Date(r.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        const minsUntil = Math.round((new Date(r.startTime).getTime() - Date.now()) / 60000);
        return (
          <Link key={r.id} href="/volunteers"
            className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-amber-100 bg-amber-50/40 hover:bg-amber-50 transition">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <MdSchedule className="text-amber-500 text-base shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <span>{startStr}</span>
                <span className="text-amber-600 font-bold">עוד {minsUntil} דק׳</span>
                {slotsLeft > 0 && <span className="text-amber-700 font-bold">חסרים {slotsLeft}</span>}
              </p>
            </div>
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </Link>
        );
      })}

      {/* Creator's requests */}
      {myCreatedAlerts.filter(r => r.needsMore || r.isNow || r.isSoon).map(r => {
        const startStr = new Date(r.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        const endStr = new Date(r.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        const pct = Math.min(100, Math.round((r.filled / r.requiredCount) * 100));
        const statusLabel = r.isNow ? "פעיל" : r.isSoon ? "בקרוב" : "חסרים";
        const dotColor = r.isNow ? "bg-green-500" : r.isSoon ? "bg-amber-400" : "bg-red-400";
        const badgeBg = r.isNow ? "bg-green-100 text-green-700" : r.isSoon ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
        const barColor = pct >= 100 ? "bg-green-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
        return (
          <Link key={`my-${r.id}`} href="/volunteers"
            className="block px-3.5 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
              <MdPeople className="text-teal-500 text-base shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${badgeBg}`}>{statusLabel}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <MdAccessTime className="text-[10px]" />{startStr}–{endStr}
                  </p>
                  <span className={`text-[10px] font-bold ${pct >= 100 ? "text-green-600" : "text-gray-600"}`}>{r.filled}/{r.requiredCount}</span>
                </div>
              </div>
              <MdChevronLeft className="text-gray-300 shrink-0" />
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-2 mr-7">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
