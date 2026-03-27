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
  onShorten: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

const minuteOptions = [5, 10, 15, 20, 30];

export default function ShortenScreen({ event, durationMin, minutes, setMinutes, reason, setReason, onShorten, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">{t.mamash.shortenMinutes}</p>
      <div className="flex gap-2 flex-wrap">
        {minuteOptions.filter(m => m < durationMin).map(m => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              minutes === m ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            -{m} דק&apos;
          </button>
        ))}
      </div>
      <div className="bg-orange-50 rounded-lg p-2 text-[10px] text-orange-700" dir="ltr">
        {fmt(event.startTime)}–{fmt(event.endTime)} ({durationMin} דק&apos;) → {fmt(event.startTime)}–{fmt(addMinutesToISO(event.endTime, -minutes))} ({durationMin - minutes} דק&apos;)
      </div>
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onShorten} disabled={acting || minutes >= durationMin}
        className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:opacity-50">
        {t.mamash.baltamShorten} {minutes} דק&apos;
      </button>
    </div>
  );
}
