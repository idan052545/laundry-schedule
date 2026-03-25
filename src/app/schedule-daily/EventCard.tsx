"use client";

import {
  MdNotifications, MdPersonAdd,
  MdAccessAlarm, MdAccessTime,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";
import { TYPE_CONFIG, getTargetLabels } from "./constants";
import { ScheduleEvent } from "./types";
import { formatTime, formatEndTime, getDurationMin, isEventNow, isNameInTitle } from "./utils";

interface EventCardProps {
  event: ScheduleEvent;
  compact: boolean;
  isAdmin: boolean;
  isToday: boolean;
  reminding: string | null;
  currentUserId?: string;
  currentUserName?: string;
  onDetail: (event: ScheduleEvent) => void;
  onRemind: (id: string) => void;
  onRemindAssigned: (id: string) => void;
  onAssign: (event: ScheduleEvent) => void;
  getTranslation?: (text: string) => string;
}

export default function EventCard({
  event, compact, isAdmin, isToday,
  reminding, currentUserId, currentUserName, onDetail, onRemind, onRemindAssigned, onAssign,
  getTranslation,
}: EventCardProps) {
  const { t, dateLocale } = useLanguage();
  const tr = getTranslation || ((text: string) => text);
  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
  const targetLabels = getTargetLabels(t);
  const Icon = config.icon;
  const active = isEventNow(event, isToday);
  const duration = getDurationMin(event);
  const isAssignedToMe = (currentUserId ? event.assignees.some(a => a.userId === currentUserId) : false) || isNameInTitle(event.title, currentUserName || "");
  const isTeamEvent = event.target !== "all";

  const cardBg = isAssignedToMe
    ? "bg-gradient-to-l from-teal-50/90 to-emerald-50/90 border-teal-300"
    : isTeamEvent
      ? "bg-gradient-to-l from-cyan-50/80 to-sky-50/80 border-cyan-200"
      : `${config.bg} ${config.border}`;
  const cardRing = active
    ? "ring-2 ring-dotan-green/60 shadow-lg shadow-green-100/50"
    : isAssignedToMe
      ? "ring-1 ring-teal-300/60 shadow-md shadow-teal-100/40"
      : "shadow-sm hover:shadow-md";
  const leftAccent = isAssignedToMe
    ? "border-r-[4px] border-r-teal-500"
    : isTeamEvent ? "border-r-[3px] border-r-cyan-400" : "";

  return (
    <div
      onClick={() => onDetail(event)}
      className={`${compact ? "flex-1 min-w-0" : "flex-1"} rounded-2xl border ${compact ? "p-2.5" : "p-3.5"} transition-all duration-200 cursor-pointer overflow-hidden ${cardBg} ${cardRing} ${leftAccent} hover:scale-[1.01] active:scale-[0.99]`}
    >
      <div className="flex items-start gap-2">
        {/* Icon circle */}
        {!compact && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isAssignedToMe ? "bg-teal-100" : isTeamEvent ? "bg-cyan-100" : config.bg
          } ${active ? "animate-pulse" : ""}`}>
            <Icon className={`text-lg ${isAssignedToMe ? "text-teal-600" : isTeamEvent ? "text-cyan-600" : config.color}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {compact && <Icon className={`text-sm ${config.color} shrink-0`} />}
            <h3 className={`font-bold text-gray-800 ${compact ? "text-xs" : "text-[13px]"} leading-tight truncate`}>{tr(event.title)}</h3>
            {active && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-[8px] font-bold animate-pulse shadow-sm">
                {t.common.now}
              </span>
            )}
            {isTeamEvent && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full text-[8px] font-bold shadow-sm">
                {targetLabels[event.target] || t.common.team}
              </span>
            )}
            {isAssignedToMe && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full text-[8px] font-bold shadow-sm">
                {t.schedule.forYou}
              </span>
            )}
          </div>

          {compact && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 font-medium" dir="ltr">
              <MdAccessTime className="text-[10px]" />
              {formatTime(event.startTime, dateLocale)} – {formatEndTime(event.startTime, event.endTime, dateLocale)}
            </div>
          )}

          {!compact && (
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
              {duration > 0 && (
                <span className="flex items-center gap-0.5">
                  <MdAccessTime className="text-[10px]" />
                  {duration >= 60 ? `${Math.floor(duration / 60)} ${t.common.hours}` : ""}{duration % 60 > 0 ? ` ${duration % 60} ${t.common.minutes}` : ""}
                </span>
              )}
            </div>
          )}

          {!compact && event.description && (
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{tr(event.description!)}</p>
          )}

          {!compact && event.assignees.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {event.assignees.slice(0, 5).map((a) => (
                <Avatar key={a.id} name={a.user.name} image={a.user.image} size="xs" />
              ))}
              {event.assignees.length > 5 && (
                <span className="text-[10px] text-gray-400 font-medium">+{event.assignees.length - 5}</span>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className={`flex items-center gap-1.5 ${compact ? "mt-1" : "mt-2"}`}>
            {!active && event.assignees.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemindAssigned(event.id); }}
                disabled={reminding === event.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 text-[10px] font-medium transition disabled:opacity-50"
              >
                <MdAccessAlarm className={`text-xs ${reminding === event.id ? "animate-bounce" : ""}`} />
                {t.schedule.remindAssigned}
              </button>
            )}
            {isAdmin && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onRemind(event.id); }} disabled={reminding === event.id}
                  className="p-1 rounded-full hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                  <MdNotifications className={`${compact ? "text-xs" : "text-sm"} ${reminding === event.id ? "animate-bounce" : ""}`} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAssign(event); }}
                  className="p-1 rounded-full hover:bg-purple-50 text-gray-300 hover:text-purple-500 transition">
                  <MdPersonAdd className={compact ? "text-xs" : "text-sm"} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
