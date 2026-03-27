"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent } from "../types";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  reason: string;
  setReason: (s: string) => void;
  onCancel: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function CancelScreen({ event, reason, setReason, onCancel, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">{t.mamash.cancelConfirm}</p>
      {event.assignees.length > 0 && (
        <div className="bg-red-50 rounded-lg p-2">
          <span className="text-[10px] text-gray-500">{t.mamash.affectedPeople}:</span>
          <div className="text-xs text-gray-700 mt-1">{event.assignees.map(a => a.user.name).join(", ")}</div>
        </div>
      )}
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onCancel} disabled={acting}
        className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-50">
        {t.mamash.baltamCancel}
      </button>
    </div>
  );
}
