"use client";

import { MdClose, MdAccessTime, MdPeople, MdEdit, MdPersonAdd, MdDelete } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { TYPE_CONFIG, TARGET_LABELS } from "./constants";
import { ScheduleEvent } from "./types";
import { formatTime, getDurationMin } from "./utils";

interface EventDetailModalProps {
  event: ScheduleEvent;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (event: ScheduleEvent) => void;
  onAssign: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
}

export default function EventDetailModal({ event, isAdmin, onClose, onEdit, onAssign, onDelete }: EventDetailModalProps) {
  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
  const Icon = config.icon;
  const duration = getDurationMin(event);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${config.bg}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`text-xl ${config.color} shrink-0`} />
            <h3 className="font-bold text-gray-800 text-base">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <MdClose />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MdAccessTime className="text-gray-400" />
            {event.allDay ? (
              <span>כל היום</span>
            ) : (
              <span dir="ltr">{formatTime(event.startTime)} – {formatTime(event.endTime)}
                {duration > 0 && <span className="text-gray-400 ml-1">
                  ({duration >= 60 ? `${Math.floor(duration / 60)} שע׳` : ""}{duration % 60 > 0 ? ` ${duration % 60} דק׳` : ""})
                </span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MdPeople className="text-gray-400" />
            <span>{TARGET_LABELS[event.target] || event.target}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.border} border ${config.color}`}>
              {config.label}
            </span>
          </div>

          {event.description && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {event.assignees.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">משויכים</div>
              <div className="space-y-1.5">
                {event.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Avatar name={a.user.name} image={a.user.image} size="sm" />
                    <span className="text-sm text-gray-700">{a.user.name}</span>
                    {a.user.team && <span className="text-xs text-gray-400">צוות {a.user.team}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => { onEdit(event); onClose(); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center justify-center gap-1">
                <MdEdit className="text-sm" /> עריכה
              </button>
              <button onClick={() => { onAssign(event); onClose(); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center justify-center gap-1">
                <MdPersonAdd className="text-sm" /> שיוך
              </button>
              <button onClick={() => { onDelete(event.id); onClose(); }}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm font-medium flex items-center justify-center gap-1">
                <MdDelete className="text-sm" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
