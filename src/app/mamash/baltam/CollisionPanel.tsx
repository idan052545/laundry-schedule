"use client";

import { MdWarning } from "react-icons/md";
import type { useLanguage } from "@/i18n";
import type { TeamCollision } from "./types";
import { fmt } from "./utils";

interface TeamCollisionPanelProps {
  teamCollisions: TeamCollision[];
  pickedResolutions: Record<string, { newStartTime: string; newEndTime: string }>;
  setPickedResolutions: React.Dispatch<React.SetStateAction<Record<string, { newStartTime: string; newEndTime: string }>>>;
  onApply: () => void;
  acting: boolean;
}

export function TeamCollisionPanel({ teamCollisions, pickedResolutions, setPickedResolutions, onApply, acting }: TeamCollisionPanelProps) {
  return (
    <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <MdWarning className="text-amber-500 text-sm" />
        <span className="text-xs font-bold text-amber-800">
          {teamCollisions.length} התנגשויות — בחר פתרון לכל אחת:
        </span>
      </div>

      {teamCollisions.map(c => (
        <div key={c.eventId} className="bg-white rounded-lg p-2.5 border border-amber-100">
          <div className="text-xs font-bold text-gray-800">{c.eventTitle}</div>
          <div className="text-[10px] text-gray-500" dir="ltr">
            {fmt(c.startTime)}–{fmt(c.endTime)} · חפיפה {c.overlapMinutes} דק&apos;
            {c.assignees.length > 0 && ` · ${c.assignees.map(a => a.name.split(" ")[0]).join(", ")}`}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {c.resolutions.map(r => {
              const isSelected = pickedResolutions[c.eventId]?.newStartTime === r.newStartTime
                && pickedResolutions[c.eventId]?.newEndTime === r.newEndTime;
              return (
                <button
                  key={r.type}
                  onClick={() => setPickedResolutions(prev => ({
                    ...prev,
                    [c.eventId]: { newStartTime: r.newStartTime, newEndTime: r.newEndTime },
                  }))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {r.label}
                  <span className="font-normal mr-1" dir="ltr">
                    ({fmt(r.newStartTime)}–{fmt(r.newEndTime)})
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setPickedResolutions(prev => {
                const next = { ...prev };
                delete next[c.eventId];
                return next;
              })}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                !pickedResolutions[c.eventId] ? "bg-gray-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              השאר חפיפה
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={onApply}
        disabled={acting}
        className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:opacity-50"
      >
        בצע שינוי + סדר {Object.keys(pickedResolutions).length > 0 ? `(${Object.keys(pickedResolutions).length} יוזזו)` : ""}
      </button>
    </div>
  );
}

interface CascadeConflictPanelProps {
  cascadeConflicts: Array<{ eventTitle: string; affectedUsers: { name: string }[] }>;
  onForce: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export function CascadeConflictPanel({ cascadeConflicts, onForce, acting, t }: CascadeConflictPanelProps) {
  return (
    <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <MdWarning className="text-amber-500 text-sm" />
        <span className="text-xs font-bold text-amber-800">{t.mamash.conflictWarning}</span>
      </div>
      {cascadeConflicts.map((c, i) => (
        <div key={i} className="text-[10px] text-amber-700 mt-1">
          {c.eventTitle} — {c.affectedUsers.map(u => u.name).join(", ")}
        </div>
      ))}
      <button
        onClick={onForce}
        disabled={acting}
        className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-lg hover:bg-amber-200"
      >
        {t.mamash.forceMove}
      </button>
    </div>
  );
}
