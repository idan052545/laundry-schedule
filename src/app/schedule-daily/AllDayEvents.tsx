"use client";

import { MdWbSunny } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { TYPE_CONFIG } from "./constants";
import { ScheduleEvent } from "./types";
import { isEventNow, isNameInTitle } from "./utils";

interface AllDayEventsProps {
  events: ScheduleEvent[];
  isToday: boolean;
  myUserId?: string;
  myName: string;
  getTranslation?: (text: string) => string;
}

export default function AllDayEvents({ events, isToday, myUserId, myName, getTranslation }: AllDayEventsProps) {
  const tr = getTranslation || ((text: string) => text);
  const { t } = useLanguage();
  if (events.length === 0) return null;

  return (
    <div className="mb-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-100 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <MdWbSunny className="text-amber-400 text-sm" />
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t.common.allDay}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {events.map((event) => {
          const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
          const Icon = config.icon;
          const active = isEventNow(event, isToday);
          const isTeam = event.target !== "all";
          const isMine = (myUserId ? event.assignees.some(a => a.userId === myUserId) : false) || isNameInTitle(event.title, myName);
          return (
            <div key={event.id} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              isMine ? "bg-gradient-to-l from-teal-50 to-emerald-50 border-teal-200 shadow-sm" : isTeam ? "bg-gradient-to-l from-cyan-50 to-sky-50 border-cyan-200" : `${config.bg} ${config.border}`
            } ${active ? "ring-2 ring-dotan-green/40 shadow-md" : "hover:shadow-sm"}`}>
              <Icon className={`text-base ${isMine ? "text-teal-600" : isTeam ? "text-cyan-600" : config.color}`} />
              <span className={`${isMine ? "text-teal-800" : isTeam ? "text-cyan-700" : "text-gray-700"} font-semibold`}>{tr(event.title)}</span>
              {isTeam && <span className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full text-[8px] font-bold shadow-sm">{t.common.team}</span>}
              {isMine && <span className="px-1.5 py-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full text-[8px] font-bold shadow-sm">{t.schedule.forYou}</span>}
              {active && <span className="w-2 h-2 rounded-full bg-dotan-green animate-pulse shadow-sm" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
