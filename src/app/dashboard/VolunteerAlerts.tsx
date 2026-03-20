"use client";

import Link from "next/link";
import {
  MdWarning, MdVolunteerActivism, MdAccessTime, MdSchedule,
  MdPeople, MdChevronLeft, MdPhone, MdHourglassEmpty,
} from "react-icons/md";
import type { DashboardFeed } from "./types";
import { useLanguage } from "@/i18n";

interface VolunteerAlertsProps {
  feed: DashboardFeed;
}

export default function VolunteerAlerts({ feed }: VolunteerAlertsProps) {
  const { t, dateLocale } = useLanguage();
  const nowMs = Date.now();
  const hourFromNow = nowMs + 60 * 60 * 1000;
  const reqs = feed.activeVolunteerRequests || [];

  // Filter out ended requests (safety — API should already exclude them)
  const active = reqs.filter(r => new Date(r.endTime).getTime() > nowMs);

  const urgent = active.filter(r => r.priority === "urgent");
  const now = active.filter(r => {
    const s = new Date(r.startTime).getTime();
    const e = new Date(r.endTime).getTime();
    return nowMs >= s && nowMs <= e && r.priority !== "urgent";
  });
  const soon = active.filter(r => {
    const s = new Date(r.startTime).getTime();
    return s > nowMs && s <= hourFromNow && r.priority !== "urgent";
  });
  // Not started yet and not starting soon — still waiting for participants
  const waiting = active.filter(r => {
    const s = new Date(r.startTime).getTime();
    const filled = r._count.assignments;
    return s > hourFromNow && r.priority !== "urgent" && filled < r.requiredCount;
  });

  const myCreatedAlerts = (feed.myCreatedRequests || [])
    .filter(r => new Date(r.endTime).getTime() > nowMs) // exclude ended
    .map(r => {
      const filled = r._count.assignments;
      const s = new Date(r.startTime).getTime();
      const e = new Date(r.endTime).getTime();
      const isNow = nowMs >= s && nowMs <= e;
      const isSoon = s > nowMs && s <= hourFromNow;
      const needsMore = filled < r.requiredCount;
      return { ...r, filled, isNow, isSoon, needsMore };
    });

  const hasVolAlerts = urgent.length > 0 || now.length > 0 || soon.length > 0 || waiting.length > 0 || feed?.urgentReplacement;
  const hasMyCreatedAlerts = myCreatedAlerts.some(r => r.needsMore || r.isNow || r.isSoon);

  if (!hasVolAlerts && !hasMyCreatedAlerts) return null;

  const formatTimeIL = (dt: string) =>
    new Date(dt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

  return (
    <div className="mb-3 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Urgent replacement — red strip */}
      {feed?.urgentReplacement && (
        <Link href={`/volunteers?highlight=${feed.urgentReplacement.request.id}`}
          className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border-b border-red-100 hover:bg-red-100/60 transition">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <MdWarning className="text-red-500 text-base shrink-0" />
          <p className="text-xs font-bold text-red-700 flex-1 truncate">{t.volAlerts.needsReplacement} {feed.urgentReplacement.request.title}</p>
          <MdChevronLeft className="text-red-400 shrink-0" />
        </Link>
      )}

      {/* Urgent requests */}
      {urgent.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = r.requiredCount - filled;
        return (
          <div key={r.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-red-100 bg-red-50/50">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <MdVolunteerActivism className="text-red-500 text-base shrink-0" />
            <Link href="/volunteers" className="flex-1 min-w-0 hover:opacity-80 transition">
              <p className="text-xs font-bold text-gray-800 truncate">{r.title} <span className="text-red-500 font-black">{t.volAlerts.urgent}</span></p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <MdAccessTime className="text-[10px]" />{formatTimeIL(r.startTime)}
                <span className="text-red-600 font-bold">{t.volAlerts.missing} {slotsLeft}</span>
              </p>
            </Link>
            {r.createdBy.phone && (
              <a href={`tel:${r.createdBy.phone}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold hover:bg-red-200 transition shrink-0"
                title={`${t.volAlerts.callCreator} ${r.createdBy.name}`}>
                <MdPhone className="text-xs" /> {r.createdBy.name.split(" ")[0]}
              </a>
            )}
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </div>
        );
      })}

      {/* Happening NOW */}
      {now.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = Math.max(0, r.requiredCount - filled);
        return (
          <div key={r.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-green-100 bg-green-50/50">
            <span className="relative shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 block" />
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </span>
            <MdVolunteerActivism className="text-green-600 text-base shrink-0" />
            <Link href="/volunteers" className="flex-1 min-w-0 hover:opacity-80 transition">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">{t.volAlerts.now}</span>
              </div>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <span>{t.volAlerts.until} {formatTimeIL(r.endTime)}</span>
                <span className="font-semibold text-gray-600">{filled}/{r.requiredCount}</span>
                {slotsLeft > 0 && <span className="text-amber-600 font-bold">{t.volAlerts.missing} {slotsLeft}</span>}
              </p>
            </Link>
            {slotsLeft > 0 && r.createdBy.phone && (
              <a href={`tel:${r.createdBy.phone}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-bold hover:bg-green-200 transition shrink-0"
                title={`${t.volAlerts.callCreator} ${r.createdBy.name}`}>
                <MdPhone className="text-xs" /> {r.createdBy.name.split(" ")[0]}
              </a>
            )}
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </div>
        );
      })}

      {/* Starting soon */}
      {soon.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = Math.max(0, r.requiredCount - filled);
        const minsUntil = Math.round((new Date(r.startTime).getTime() - Date.now()) / 60000);
        return (
          <div key={r.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-amber-100 bg-amber-50/40">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <MdSchedule className="text-amber-500 text-base shrink-0" />
            <Link href="/volunteers" className="flex-1 min-w-0 hover:opacity-80 transition">
              <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <span>{formatTimeIL(r.startTime)}</span>
                <span className="text-amber-600 font-bold">{t.volAlerts.inMinutes.replace("{n}", String(minsUntil))}</span>
                {slotsLeft > 0 && <span className="text-amber-700 font-bold">{t.volAlerts.missing} {slotsLeft}</span>}
              </p>
            </Link>
            {slotsLeft > 0 && r.createdBy.phone && (
              <a href={`tel:${r.createdBy.phone}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold hover:bg-amber-200 transition shrink-0"
                title={`${t.volAlerts.callCreator} ${r.createdBy.name}`}>
                <MdPhone className="text-xs" /> {r.createdBy.name.split(" ")[0]}
              </a>
            )}
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </div>
        );
      })}

      {/* Waiting for participants (not started, not starting soon, still unfilled) */}
      {waiting.map(r => {
        const filled = r._count.assignments;
        const slotsLeft = r.requiredCount - filled;
        return (
          <div key={`wait-${r.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gray-100 bg-gray-50/40">
            <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
            <MdHourglassEmpty className="text-gray-400 text-base shrink-0" />
            <Link href="/volunteers" className="flex-1 min-w-0 hover:opacity-80 transition">
              <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <MdAccessTime className="text-[10px]" />{formatTimeIL(r.startTime)}
                <span className="text-gray-600 font-bold">{filled}/{r.requiredCount}</span>
                <span className="text-gray-500">{t.volAlerts.waitingForParticipants}</span>
              </p>
            </Link>
            {r.createdBy.phone && (
              <a href={`tel:${r.createdBy.phone}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 transition shrink-0"
                title={`${t.volAlerts.callCreator} ${r.createdBy.name}`}>
                <MdPhone className="text-xs" /> {r.createdBy.name.split(" ")[0]}
              </a>
            )}
            <MdChevronLeft className="text-gray-300 shrink-0" />
          </div>
        );
      })}

      {/* Creator's requests */}
      {myCreatedAlerts.filter(r => r.needsMore || r.isNow || r.isSoon).map(r => {
        const pct = Math.min(100, Math.round((r.filled / r.requiredCount) * 100));
        const statusLabel = r.isNow ? t.volAlerts.active : r.isSoon ? t.volAlerts.soon : t.volAlerts.missing;
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
                    <MdAccessTime className="text-[10px]" />{formatTimeIL(r.startTime)}–{formatTimeIL(r.endTime)}
                  </p>
                  <span className={`text-[10px] font-bold ${pct >= 100 ? "text-green-600" : "text-gray-600"}`}>{r.filled}/{r.requiredCount}</span>
                </div>
              </div>
              <MdChevronLeft className="text-gray-300 shrink-0" />
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-2 me-7">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
