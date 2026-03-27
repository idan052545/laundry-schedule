"use client";

import Link from "next/link";
import {
  MdCheckCircle, MdVolunteerActivism, MdAccessTime, MdPeople, MdThumbUp,
} from "react-icons/md";
import { useState } from "react";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";

interface QuickAssignCardsProps {
  requests: DashboardFeed["activeVolunteerRequests"];
  onQuickAssign: (requestId: string) => Promise<boolean>;
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function QuickAssignCards({ requests, onQuickAssign, dateLocale, t, getTranslation }: QuickAssignCardsProps) {
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const handleAssign = async (requestId: string) => {
    setAssigningId(requestId);
    const success = await onQuickAssign(requestId);
    if (success) {
      setDoneIds(prev => new Set(prev).add(requestId));
    }
    setAssigningId(null);
  };

  return (
    <div className="space-y-2">
      {requests.map(r => {
        const fmtT = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        const isDone = doneIds.has(r.id);
        const isAssigning = assigningId === r.id;
        return (
          <div key={r.id} className={`rounded-2xl border-2 p-3 transition ${
            r.priority === "urgent" ? "border-red-200 bg-red-50/20" :
            r.isCommanderRequest ? "border-amber-200 bg-amber-50/20" :
            "border-green-200 bg-green-50/20"
          }`}>
            <div className="flex items-center justify-between gap-2">
              <Link href="/volunteers" className="flex items-center gap-2 min-w-0 flex-1">
                <MdVolunteerActivism className={`text-lg shrink-0 ${r.priority === "urgent" ? "text-red-500" : "text-green-500"}`} />
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-800 truncate block">{getTranslation(r.title)}</span>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="flex items-center gap-0.5"><MdAccessTime className="text-[10px]" /> {fmtT(r.startTime)}–{fmtT(r.endTime)}</span>
                    <span className="flex items-center gap-0.5"><MdPeople className="text-[10px]" /> {r._count?.assignments ?? 0}/{r.requiredCount}</span>
                    {r.priority === "urgent" && <span className="text-red-500 font-bold">{t.volunteers.urgentBadge}</span>}
                  </div>
                </div>
              </Link>
              {isDone ? (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-xs font-bold shrink-0">
                  <MdCheckCircle className="text-sm" /> {t.volunteers.iVolunteered}
                </span>
              ) : (
                <button onClick={() => handleAssign(r.id)} disabled={isAssigning || assigningId !== null}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition disabled:opacity-50 shrink-0">
                  {isAssigning ? (
                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t.volunteers.joining}</>
                  ) : (
                    <><MdThumbUp className="text-sm" /> {t.volunteers.iVolunteer}</>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
