"use client";

import type { useLanguage } from "@/i18n";
import ReasonInput from "./ReasonInput";

interface Props {
  newStart: string;
  setNewStart: (s: string) => void;
  newEnd: string;
  setNewEnd: (s: string) => void;
  reason: string;
  setReason: (s: string) => void;
  onReschedule: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function RescheduleScreen({ newStart, setNewStart, newEnd, setNewEnd, reason, setReason, onReschedule, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newStart}</span>
          <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
        </label>
        <label>
          <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newEnd}</span>
          <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
        </label>
      </div>
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onReschedule} disabled={acting}
        className="w-full py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 disabled:opacity-50">
        {t.mamash.baltamMove}
      </button>
    </div>
  );
}
