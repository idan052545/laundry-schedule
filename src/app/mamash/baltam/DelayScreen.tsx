"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent } from "../types";
import { fmt, addMinutesToISO } from "./utils";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  minutes: number;
  setMinutes: (m: number) => void;
  reason: string;
  setReason: (s: string) => void;
  onDelay: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

const minuteOptions = [5, 10, 15, 20, 30];

export default function DelayScreen({ event, minutes, setMinutes, reason, setReason, onDelay, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">{t.mamash.delayMinutes}</p>
      <div className="flex gap-2 flex-wrap">
        {minuteOptions.map(m => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              minutes === m ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            +{m} דק&apos;
          </button>
        ))}
      </div>
      <div className="bg-blue-50 rounded-lg p-2 text-[10px] text-blue-700" dir="ltr">
        {fmt(event.startTime)}–{fmt(event.endTime)} → {fmt(addMinutesToISO(event.startTime, minutes))}–{fmt(addMinutesToISO(event.endTime, minutes))}
      </div>
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onDelay} disabled={acting}
        className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:opacity-50">
        {t.mamash.baltamDelayStart} +{minutes} דק&apos;
      </button>
    </div>
  );
}
