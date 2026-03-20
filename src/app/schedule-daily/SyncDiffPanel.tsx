"use client";

import { MdSync, MdNotifications, MdClose } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface SyncDiff {
  added: string[];
  removed: string[];
  updated: string[];
  unchanged: boolean;
}

interface SyncDiffPanelProps {
  diff: SyncDiff | null;
  onClose: () => void;
  onNotify?: () => void;
  notifyDisabled?: boolean;
  label: string;
  notifyLabel: string;
  unchangedLabel: string;
  variant: "platoon" | "team";
}

export default function SyncDiffPanel({ diff, onClose, onNotify, notifyDisabled, label, notifyLabel, unchangedLabel, variant }: SyncDiffPanelProps) {
  const { t } = useLanguage();
  if (!diff) return null;

  if (diff.unchanged) {
    return (
      <div className={`rounded-xl border p-3 mb-3 text-center text-sm font-medium ${
        variant === "team" ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-green-50 border-green-200 text-green-700"
      }`}>
        {unchangedLabel}
      </div>
    );
  }

  const gradientClass = variant === "team"
    ? "from-teal-50 to-cyan-50 border-teal-200"
    : "from-blue-50 to-indigo-50 border-blue-200";
  const titleColor = variant === "team" ? "text-teal-800" : "text-blue-800";
  const iconColor = variant === "team" ? "text-teal-500" : "text-blue-500";
  const btnClass = variant === "team"
    ? "bg-teal-600 hover:bg-teal-700"
    : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className={`bg-gradient-to-br ${gradientClass} rounded-2xl border p-4 mb-3 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-bold ${titleColor} text-sm flex items-center gap-2`}>
          <MdSync className={iconColor} /> {label}
        </h3>
        <div className="flex gap-2">
          {onNotify && (
            <button onClick={onNotify} disabled={notifyDisabled}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg ${btnClass} text-white text-xs font-medium transition disabled:opacity-50`}>
              <MdNotifications className="text-xs" /> {notifyLabel}
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose /></button>
        </div>
      </div>
      {diff.updated?.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-bold text-amber-700 uppercase">{t.schedule.updated}</span>
          {diff.updated.map((item, i) => (
            <div key={i} className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1 mt-1 border border-amber-200">✏️ {item}</div>
          ))}
        </div>
      )}
      {diff.added.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-bold text-green-700 uppercase">{t.schedule.added}</span>
          {diff.added.map((item, i) => (
            <div key={i} className="text-xs text-green-800 bg-green-50 rounded-lg px-2 py-1 mt-1 border border-green-200">+ {item}</div>
          ))}
        </div>
      )}
      {diff.removed.length > 0 && (
        <div>
          <span className="text-[10px] font-bold text-red-700 uppercase">{t.schedule.removed}</span>
          {diff.removed.map((item, i) => (
            <div key={i} className="text-xs text-red-800 bg-red-50 rounded-lg px-2 py-1 mt-1 border border-red-200">- {item}</div>
          ))}
        </div>
      )}
    </div>
  );
}
