"use client";

import { MdEdit, MdDelete } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { TYPE_CONFIG } from "./constants";
import { ScheduleEvent } from "./types";
import { isEventNow, isNameInTitle } from "./utils";

interface AllDayEventsProps {
  events: ScheduleEvent[];
  isToday: boolean;
  canEdit: boolean;
  myUserId?: string;
  myName: string;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
}

export default function AllDayEvents({ events, isToday, canEdit, myUserId, myName, onEdit, onDelete }: AllDayEventsProps) {
  const { t } = useLanguage();
  if (events.length === 0) return null;

  return (
    <div className="mb-3 bg-gray-50 rounded-xl border border-gray-200 p-3">
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">{t.common.allDay}</div>
      <div className="flex flex-wrap gap-1.5">
        {events.map((event) => {
          const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
          const Icon = config.icon;
          const active = isEventNow(event, isToday);
          const isTeam = event.target !== "all";
          const isMine = (myUserId ? event.assignees.some(a => a.userId === myUserId) : false) || isNameInTitle(event.title, myName);
          return (
            <div key={event.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
              isMine ? "bg-teal-50 border-teal-300" : isTeam ? "bg-cyan-50 border-cyan-200" : `${config.bg} ${config.border}`
            } ${active ? "ring-1 ring-dotan-green" : ""}`}>
              <Icon className={`text-sm ${isMine ? "text-teal-600" : isTeam ? "text-cyan-600" : config.color}`} />
              <span className={isMine ? "text-teal-800" : isTeam ? "text-cyan-700" : "text-gray-700"}>{event.title}</span>
              {isTeam && <span className="px-1 py-0.5 bg-cyan-500 text-white rounded text-[8px] font-bold">{t.common.team}</span>}
              {isMine && <span className="px-1 py-0.5 bg-teal-500 text-white rounded text-[8px] font-bold">{t.schedule.forYou}</span>}
              {active && <span className="w-1.5 h-1.5 rounded-full bg-dotan-green animate-pulse" />}
              {canEdit && (
                <div className="flex items-center gap-0.5 me-1">
                  <button onClick={() => onEdit(event)} className="text-gray-300 hover:text-gray-500"><MdEdit className="text-xs" /></button>
                  <button onClick={() => onDelete(event.id)} className="text-gray-300 hover:text-red-500"><MdDelete className="text-xs" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
