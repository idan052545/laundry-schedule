"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent } from "../types";
import { fmt } from "./utils";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  swappableEvents: ScheduleEvent[];
  swapEventId: string;
  setSwapEventId: (s: string) => void;
  reason: string;
  setReason: (s: string) => void;
  onSwap: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function SwapScreen({ event, swappableEvents, swapEventId, setSwapEventId, reason, setReason, onSwap, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <label>
        <span className="text-[10px] text-gray-500 font-bold">{t.mamash.swapWith}</span>
        <select value={swapEventId} onChange={e => setSwapEventId(e.target.value)}
          className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
          <option value="">{t.mamash.selectEvent}</option>
          {swappableEvents.map(e => (
            <option key={e.id} value={e.id}>
              {e.title} ({fmt(e.startTime)}–{fmt(e.endTime)}) — {e.assignees.map(a => a.user.name.split(" ")[0]).join(", ") || "ללא"}
            </option>
          ))}
        </select>
      </label>
      {swapEventId && (() => {
        const other = swappableEvents.find(e => e.id === swapEventId);
        if (!other) return null;
        return (
          <div className="bg-purple-50 rounded-lg p-2 text-[10px] text-purple-700">
            <div>{event.title}: {event.assignees.map(a => a.user.name.split(" ")[0]).join(", ")} → {other.assignees.map(a => a.user.name.split(" ")[0]).join(", ") || "ללא"}</div>
            <div>{other.title}: {other.assignees.map(a => a.user.name.split(" ")[0]).join(", ") || "ללא"} → {event.assignees.map(a => a.user.name.split(" ")[0]).join(", ")}</div>
          </div>
        );
      })()}
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onSwap} disabled={acting || !swapEventId}
        className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 disabled:opacity-50">
        {t.mamash.baltamSwap}
      </button>
    </div>
  );
}
