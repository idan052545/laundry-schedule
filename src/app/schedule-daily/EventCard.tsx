"use client";

import {
  MdEdit, MdDelete, MdNotifications, MdPersonAdd,
  MdArrowUpward, MdArrowDownward,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { TYPE_CONFIG, TARGET_LABELS } from "./constants";
import { ScheduleEvent } from "./types";
import { formatTime, getDurationMin, isEventNow } from "./utils";

interface EventCardProps {
  event: ScheduleEvent;
  idx: number;
  compact: boolean;
  isAdmin: boolean;
  isToday: boolean;
  timedEventsLength: number;
  reminding: string | null;
  onDetail: (event: ScheduleEvent) => void;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  onRemind: (id: string) => void;
  onAssign: (event: ScheduleEvent) => void;
  onMove: (idx: number, direction: "up" | "down") => void;
}

export default function EventCard({
  event, idx, compact, isAdmin, isToday, timedEventsLength,
  reminding, onDetail, onEdit, onDelete, onRemind, onAssign, onMove,
}: EventCardProps) {
  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
  const Icon = config.icon;
  const active = isEventNow(event, isToday);
  const duration = getDurationMin(event);

  return (
    <div
      onClick={() => onDetail(event)}
      className={`${compact ? "flex-1 min-w-0" : "flex-1"} rounded-xl border ${compact ? "p-2" : "p-3"} transition cursor-pointer ${config.bg} ${config.border} ${active ? "ring-2 ring-dotan-green shadow-md" : "shadow-sm"}`}
    >
      <div className="flex items-start gap-1.5">
        {isAdmin && !compact && (
          <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onMove(idx, "up"); }}
              disabled={idx === 0}
              className="text-gray-300 hover:text-dotan-green disabled:opacity-20 disabled:hover:text-gray-300 transition">
              <MdArrowUpward className="text-sm" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMove(idx, "down"); }}
              disabled={idx === timedEventsLength - 1}
              className="text-gray-300 hover:text-dotan-green disabled:opacity-20 disabled:hover:text-gray-300 transition">
              <MdArrowDownward className="text-sm" />
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Icon className={`${compact ? "text-sm" : "text-base"} ${config.color} shrink-0`} />
            <h3 className={`font-bold text-gray-800 ${compact ? "text-xs" : "text-sm"} leading-tight truncate`}>{event.title}</h3>
            {active && (
              <span className="px-1 py-0.5 bg-dotan-green text-white rounded text-[8px] font-bold animate-pulse">
                עכשיו
              </span>
            )}
          </div>

          {compact && (
            <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </div>
          )}

          {!compact && event.target !== "all" && (
            <span className="inline-block px-1.5 py-0.5 bg-white/80 border rounded text-[9px] font-medium text-gray-500 mt-0.5">
              {TARGET_LABELS[event.target] || event.target}
            </span>
          )}

          {!compact && duration > 0 && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              {duration >= 60 ? `${Math.floor(duration / 60)} שע׳` : ""}{duration % 60 > 0 ? ` ${duration % 60} דק׳` : ""}
            </div>
          )}

          {!compact && event.description && (
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{event.description}</p>
          )}

          {!compact && event.assignees.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {event.assignees.slice(0, 4).map((a) => (
                <Avatar key={a.id} name={a.user.name} image={a.user.image} size="xs" />
              ))}
              {event.assignees.length > 4 && (
                <span className="text-[10px] text-gray-400">+{event.assignees.length - 4}</span>
              )}
            </div>
          )}

          {isAdmin && (
            <div className={`flex items-center gap-2 ${compact ? "mt-1" : "mt-2 pt-1.5 border-t border-black/5"}`}>
              {compact && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onMove(idx, "up"); }} disabled={idx === 0}
                    className="text-gray-300 hover:text-dotan-green disabled:opacity-20 transition">
                    <MdArrowUpward className="text-xs" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onMove(idx, "down"); }} disabled={idx === timedEventsLength - 1}
                    className="text-gray-300 hover:text-dotan-green disabled:opacity-20 transition">
                    <MdArrowDownward className="text-xs" />
                  </button>
                  <div className="w-px h-3 bg-gray-200" />
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); onRemind(event.id); }} disabled={reminding === event.id}
                className="text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                <MdNotifications className={`${compact ? "text-xs" : "text-sm"} ${reminding === event.id ? "animate-bounce" : ""}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onAssign(event); }} className="text-gray-300 hover:text-purple-500 transition">
                <MdPersonAdd className={compact ? "text-xs" : "text-sm"} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onEdit(event); }} className="text-gray-300 hover:text-dotan-green transition">
                <MdEdit className={compact ? "text-xs" : "text-sm"} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} className="text-gray-300 hover:text-red-500 transition mr-auto">
                <MdDelete className={compact ? "text-xs" : "text-sm"} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
