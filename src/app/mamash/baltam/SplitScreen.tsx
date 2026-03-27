"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent } from "../types";
import { fmt } from "./utils";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  splitTime: string;
  setSplitTime: (s: string) => void;
  group1: string[];
  setGroup1: React.Dispatch<React.SetStateAction<string[]>>;
  group2: string[];
  setGroup2: React.Dispatch<React.SetStateAction<string[]>>;
  reason: string;
  setReason: (s: string) => void;
  onSplit: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function SplitScreen({ event, splitTime, setSplitTime, group1, setGroup1, group2, setGroup2, reason, setReason, onSplit, acting, t }: Props) {
  return (
    <div className="space-y-3">
      <label>
        <span className="text-[10px] text-gray-500 font-bold">{t.mamash.splitTime}</span>
        <input type="time" value={splitTime} onChange={e => setSplitTime(e.target.value)}
          className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
      </label>
      {event.assignees.length > 0 && (
        <>
          <div>
            <span className="text-[10px] text-gray-500 font-bold">{t.mamash.group1}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {event.assignees.map(a => {
                const inG1 = group1.includes(a.userId);
                return (
                  <button key={a.userId}
                    onClick={() => {
                      if (inG1) {
                        setGroup1(g => g.filter(id => id !== a.userId));
                      } else {
                        setGroup1(g => [...g, a.userId]);
                        setGroup2(g => g.filter(id => id !== a.userId));
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      inG1 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                    {a.user.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold">{t.mamash.group2}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {event.assignees.map(a => {
                const inG2 = group2.includes(a.userId);
                return (
                  <button key={a.userId}
                    onClick={() => {
                      if (inG2) {
                        setGroup2(g => g.filter(id => id !== a.userId));
                      } else {
                        setGroup2(g => [...g, a.userId]);
                        setGroup1(g => g.filter(id => id !== a.userId));
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      inG2 ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                    {a.user.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {splitTime && (
        <div className="bg-amber-50 rounded-lg p-2 text-[10px] text-amber-700" dir="ltr">
          <div>Part 1: {fmt(event.startTime)}–{splitTime} ({group1.length} people)</div>
          <div>Part 2: {splitTime}–{fmt(event.endTime)} ({group2.length} people)</div>
        </div>
      )}
      <ReasonInput reason={reason} setReason={setReason} t={t} />
      <button onClick={onSplit} disabled={acting || !splitTime || group1.length === 0 || group2.length === 0}
        className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 disabled:opacity-50">
        {t.mamash.baltamSplit}
      </button>
    </div>
  );
}
