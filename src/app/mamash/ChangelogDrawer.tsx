"use client";

import { MdHistory, MdSchedule, MdCancel, MdSwapHoriz, MdPersonAdd, MdAdd } from "react-icons/md";
import { useLanguage } from "@/i18n";
import type { ChangeEntry } from "./types";

interface Props {
  changelog: ChangeEntry[];
}

const CHANGE_ICONS: Record<string, typeof MdHistory> = {
  create: MdAdd,
  reschedule: MdSchedule,
  cancel: MdCancel,
  swap: MdSwapHoriz,
  reassign: MdPersonAdd,
};

const CHANGE_COLORS: Record<string, string> = {
  create: "text-green-500 bg-green-50",
  reschedule: "text-blue-500 bg-blue-50",
  cancel: "text-red-500 bg-red-50",
  swap: "text-purple-500 bg-purple-50",
  reassign: "text-teal-500 bg-teal-50",
};

export default function ChangelogDrawer({ changelog }: Props) {
  const { t } = useLanguage();

  if (changelog.length === 0) {
    return (
      <div className="p-3 text-center text-gray-400 text-sm py-8">
        {t.mamash.noChanges}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">
        {t.mamash.todayChanges} ({changelog.length})
      </h3>
      {changelog.map(entry => {
        const Icon = CHANGE_ICONS[entry.changeType] || MdHistory;
        const colorClass = CHANGE_COLORS[entry.changeType] || "text-gray-500 bg-gray-50";
        const time = new Date(entry.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

        return (
          <div key={entry.id} className="flex items-start gap-2.5 bg-white rounded-xl border border-gray-100 p-2.5">
            <div className={`w-7 h-7 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
              <Icon className="text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-800 truncate">{entry.description}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{time}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500">{entry.createdBy.name}</span>
                {entry.reason && (
                  <span className="text-[10px] text-gray-400">· {entry.reason}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
