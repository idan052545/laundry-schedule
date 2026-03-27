"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent } from "../types";
import { israelDate } from "@/lib/israel-tz";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  date: string;
  durationMin: number;
  newStart: string;
  setNewStart: (s: string) => void;
  newEnd: string;
  setNewEnd: (s: string) => void;
  reason: string;
  setReason: (s: string) => void;
  onDuplicate: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function DuplicateScreen({ event, date, durationMin, newStart, setNewStart, newEnd, setNewEnd, reason, setReason, onDuplicate, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">{t.mamash.duplicateTime}</p>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newStart}</span>
          <input type="time" value={newStart} onChange={e => {
            setNewStart(e.target.value);
            const start = israelDate(date, e.target.value);
            const end = new Date(start.getTime() + durationMin * 60000);
            const endIL = end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
            setNewEnd(endIL);
          }}
            className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
        </label>
        <label>
          <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newEnd}</span>
          <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
        </label>
      </div>
      <div className="bg-cyan-50 rounded-lg p-2 text-[10px] text-cyan-700">
        עותק של &quot;{event.title}&quot; עם אותם משובצים
      </div>
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onDuplicate} disabled={acting}
        className="w-full py-2.5 bg-cyan-500 text-white rounded-xl text-xs font-bold hover:bg-cyan-600 disabled:opacity-50">
        {t.mamash.baltamDuplicate}
      </button>
    </div>
  );
}
