"use client";

import { MdLock, MdPeople, MdMoreVert } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { israelDate } from "@/lib/israel-tz";
import type { ScheduleEvent, FreeSlot } from "./types";

interface Props {
  events: ScheduleEvent[];
  freeSlots: FreeSlot[];
  team: number;
  onEventAction: (event: ScheduleEvent) => void;
  date: string;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

function isPassed(iso: string) {
  return new Date(iso) < new Date();
}

export default function TimelinePanel({ events, freeSlots, team, onEventAction, date }: Props) {
  const { t } = useLanguage();
  const timedEvents = events.filter(e => !e.allDay).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const allDayEvents = events.filter(e => e.allDay);
  const teamTarget = `team-${team}`;

  // Merge events with free slots for display
  type Item = { type: "event"; event: ScheduleEvent } | { type: "free"; slot: FreeSlot };
  const items: Item[] = [];

  // Add events
  for (const event of timedEvents) {
    items.push({ type: "event", event });
  }

  // Insert free slots between events
  for (const slot of freeSlots) {
    if (slot.durationMin >= 15) {
      items.push({ type: "free", slot });
    }
  }

  // Sort by start time — free slot times are Israel local (HH:MM),
  // event times are ISO/UTC, so convert both to comparable timestamps
  items.sort((a, b) => {
    const aTime = a.type === "event"
      ? new Date(a.event.startTime).getTime()
      : israelDate(date, a.slot.start).getTime();
    const bTime = b.type === "event"
      ? new Date(b.event.startTime).getTime()
      : israelDate(date, b.slot.start).getTime();
    return aTime - bTime;
  });

  return (
    <div className="p-3 space-y-2">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-2.5 mb-2">
          <span className="text-[10px] font-bold text-purple-600 uppercase">{t.mamash.allDay}</span>
          {allDayEvents.map(e => (
            <div key={e.id} className="text-xs text-purple-800 mt-1 truncate">{e.title}</div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">{t.mamash.noEvents}</div>
      )}

      {items.map((item, i) => {
        if (item.type === "free") {
          return (
            <div key={`free-${i}`} className="border-2 border-dashed border-green-300 rounded-xl px-3 py-2 bg-green-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-green-600" dir="ltr">
                  {item.slot.start}–{item.slot.end}
                </span>
                <span className="text-[10px] text-green-500">
                  {item.slot.durationMin} {t.mamash.minutes} {t.mamash.free}
                </span>
              </div>
            </div>
          );
        }

        const e = item.event;
        const isPlatoon = e.target === "all";
        const isTeam = e.target === teamTarget;
        const passed = isPassed(e.endTime);
        const isNow = !isPassed(e.endTime) && isPassed(e.startTime);

        return (
          <div
            key={e.id}
            onClick={() => !isPlatoon && onEventAction(e)}
            className={`rounded-xl border p-2.5 transition-all ${
              isPlatoon
                ? "bg-gray-50 border-gray-200 opacity-70"
                : passed
                  ? "bg-white border-gray-100 opacity-50"
                  : isNow
                    ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                    : "bg-white border-gray-200 hover:shadow-sm cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Time */}
              <div className="shrink-0 text-left w-[72px]" dir="ltr">
                <span className={`text-[11px] font-mono ${passed ? "text-gray-400 line-through" : "text-gray-700 font-bold"}`}>
                  {fmt(e.startTime)}–{fmt(e.endTime)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isPlatoon && <MdLock className="text-gray-400 text-xs shrink-0" />}
                  {isNow && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0" />}
                  <span className={`text-xs font-bold truncate ${passed ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {e.title}
                  </span>
                </div>
                {/* Assignees + sync status */}
                <div className="flex items-center gap-1 mt-1">
                  {e.assignees.length > 0 && (
                    <>
                      <MdPeople className="text-[10px] text-gray-400" />
                      <span className="text-[10px] text-gray-500 truncate">
                        {e.assignees.map(a => a.user.name.split(" ")[0]).join(", ")}
                      </span>
                    </>
                  )}
                  {isTeam && !e.calendarSynced && (
                    <span className="text-[9px] text-orange-500 font-bold mr-1">
                      {e.googleEventId ? "עדכון" : "חדש"}
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              {isTeam && !passed && (
                <button
                  onClick={(ev) => { ev.stopPropagation(); onEventAction(e); }}
                  className="p-1 rounded hover:bg-gray-100 shrink-0"
                >
                  <MdMoreVert className="text-gray-400" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
