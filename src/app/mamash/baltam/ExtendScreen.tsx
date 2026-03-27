"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent } from "../types";
import { fmt, addMinutesToISO } from "./utils";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  durationMin: number;
  minutes: number;
  setMinutes: (m: number) => void;
  reason: string;
  setReason: (s: string) => void;
  onExtend: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

const minuteOptions = [5, 10, 15, 20, 30];

export default function ExtendScreen({ event, durationMin, minutes, setMinutes, reason, setReason, onExtend, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">{t.mamash.extendMinutes}</p>
      <div className="flex gap-2 flex-wrap">
        {minuteOptions.map(m => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              minutes === m ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            +{m} דק&apos;
          </button>
        ))}
      </div>
      <div className="bg-green-50 rounded-lg p-2 text-[10px] text-green-700" dir="ltr">
        {fmt(event.startTime)}–{fmt(event.endTime)} ({durationMin} דק&apos;) → {fmt(event.startTime)}–{fmt(addMinutesToISO(event.endTime, minutes))} ({durationMin + minutes} דק&apos;)
      </div>
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onExtend} disabled={acting}
        className="w-full py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 disabled:opacity-50">
        {t.mamash.baltamExtend} {minutes} דק&apos;
      </button>
    </div>
  );
}
