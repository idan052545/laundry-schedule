"use client";

import { RefObject } from "react";
import { MdStickyNote2, MdNotifications, MdEdit, MdDelete } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { TYPE_CONFIG } from "./constants";
import { ScheduleEvent, ScheduleNote } from "./types";
import { formatTime, formatEndTime, isEventNow, groupTimedEvents, isNameInTitle } from "./utils";
import EventCard from "./EventCard";

interface TimelineProps {
  timedEvents: ScheduleEvent[];
  notes: ScheduleNote[];
  date: string;
  isToday: boolean;
  canEdit: boolean;
  myUserId?: string;
  myName: string;
  reminding: string | null;
  noteReminding: string | null;
  nowRef: RefObject<HTMLDivElement | null>;
  onDetail: (event: ScheduleEvent) => void;
  onRemind: (id: string) => void;
  onRemindAssigned: (id: string) => void;
  onAssign: (event: ScheduleEvent) => void;
  onEditNote: (note: ScheduleNote) => void;
  onDeleteNote: (id: string) => void;
  onRemindNote: (id: string) => void;
  getTranslation?: (text: string) => string;
}

export default function Timeline({
  timedEvents, notes, date, isToday, canEdit,
  myUserId, myName, reminding, noteReminding, nowRef,
  onDetail, onRemind, onRemindAssigned,
  onAssign, onEditNote, onDeleteNote, onRemindNote,
  getTranslation,
}: TimelineProps) {
  const { t, dateLocale } = useLanguage();
  const timedGroups = groupTimedEvents(timedEvents);
  const timedNotes = notes.filter((n) => n.startTime);
  const untimed = notes.filter((n) => !n.startTime);

  type TimelineItem =
    | { kind: "group"; group: (typeof timedGroups)[0]; groupIdx: number }
    | { kind: "note"; note: ScheduleNote };

  const items: TimelineItem[] = timedGroups.map((group, groupIdx) => ({
    kind: "group" as const, group, groupIdx,
  }));

  timedNotes.forEach((note) => {
    items.push({ kind: "note" as const, note });
  });

  items.sort((a, b) => {
    const aTime = a.kind === "group" ? a.group.startTime : `${date}T${a.note.startTime}:00`;
    const bTime = b.kind === "group" ? b.group.startTime : `${date}T${b.note.startTime}:00`;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  const totalItems = items.length;
  let foundNowRef = false;

  return (
    <div className="relative">
      {items.map((item, idx) => {
        if (item.kind === "group") {
          const { group } = item;
          const isSingle = group.events.length === 1;
          const groupStartTime = formatTime(group.startTime, dateLocale);
          const groupEndTime = formatEndTime(group.startTime, group.endTime, dateLocale);
          const anyActive = group.events.some(({ event }) => isEventNow(event, isToday));
          const firstConfig = TYPE_CONFIG[group.events[0].event.type] || TYPE_CONFIG.general;
          const isTeamGroup = group.events.some(({ event }) => event.target !== "all");
          const hasMyAssignment = (myUserId ? group.events.some(({ event }) => event.assignees.some(a => a.userId === myUserId)) : false) || group.events.some(({ event }) => isNameInTitle(event.title, myName));

          const now = Date.now();
          const groupStart = new Date(group.startTime).getTime();
          const isNowGroup = isToday && (anyActive || (!foundNowRef && groupStart > now));
          if (isNowGroup) foundNowRef = true;

          return (
            <div key={`g-${item.groupIdx}`} ref={isNowGroup ? nowRef : undefined} className="flex gap-2 mb-0 min-w-0">
              <div className="w-12 shrink-0 text-end pt-3">
                <div className={`text-[13px] font-extrabold tabular-nums ${anyActive ? "text-dotan-green" : isTeamGroup ? "text-cyan-600" : "text-gray-700"}`}>{groupStartTime}</div>
                <div className={`text-[10px] font-medium ${isTeamGroup ? "text-cyan-400" : "text-gray-350"}`}>{groupEndTime}</div>
              </div>
              <div className="flex flex-col items-center shrink-0 w-5">
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow shrink-0 mt-3.5 z-10 transition-all ${anyActive ? "bg-dotan-green ring-2 ring-dotan-green/30 scale-110" : hasMyAssignment ? "bg-teal-400 ring-2 ring-teal-300/40" : isTeamGroup ? "bg-cyan-400" : firstConfig.dot}`} />
                {idx < totalItems - 1 && (
                  <div className={`w-0.5 flex-1 -mt-0.5 ${anyActive ? "bg-gradient-to-b from-dotan-green/40 to-gray-200" : "bg-gray-200"}`} />
                )}
              </div>
              {isSingle ? (
                <div className="flex-1 mb-2 min-w-0">
                  <EventCard
                    event={group.events[0].event} compact={false}
                    isAdmin={canEdit} isToday={isToday}
                    reminding={reminding} currentUserId={myUserId} currentUserName={myName} onDetail={onDetail}
                    onRemind={onRemind} onRemindAssigned={onRemindAssigned} onAssign={onAssign}
                    getTranslation={getTranslation}
                  />
                </div>
              ) : (
                <div className="flex-1 mb-2 flex gap-2 min-w-0">
                  {group.events.map((evItem) => (
                    <EventCard
                      key={evItem.event.id}
                      event={evItem.event} compact={true}
                      isAdmin={canEdit} isToday={isToday}
                      reminding={reminding} currentUserId={myUserId} currentUserName={myName} onDetail={onDetail}
                      onRemind={onRemind} onRemindAssigned={onRemindAssigned} onAssign={onAssign}
                      getTranslation={getTranslation}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Note in timeline
        const { note } = item;
        const isMine = note.userId === myUserId;
        const isPersonal = note.visibility === "personal";
        return (
          <div key={`n-${note.id}`} className="flex gap-2 mb-0 min-w-0">
            <div className="w-12 shrink-0 text-end pt-3">
              <div className="text-xs font-bold text-amber-600">{note.startTime}</div>
              {note.endTime && <div className="text-[10px] text-amber-400">{note.endTime}</div>}
            </div>
            <div className="flex flex-col items-center shrink-0 w-4">
              <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-3.5 z-10 ${isPersonal ? "bg-amber-400" : "bg-orange-400"}`} />
              {idx < totalItems - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 -mt-0.5" />
              )}
            </div>
            <div className="flex-1 mb-2 min-w-0">
              <div className={`rounded-xl border-2 border-dashed p-2.5 sm:p-3 transition ${isPersonal ? "bg-amber-50/80 border-amber-300" : "bg-orange-50/80 border-orange-300"}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <MdStickyNote2 className={`text-sm shrink-0 ${isPersonal ? "text-amber-500" : "text-orange-500"}`} />
                      <span className="font-bold text-sm text-gray-800 truncate">{note.title}</span>
                      {!isMine && (
                        <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                          {note.user.name}
                        </span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isPersonal ? "text-amber-600 bg-amber-100" : "text-orange-600 bg-orange-100"}`}>
                        {isPersonal ? t.common.personal : t.common.team}
                      </span>
                    </div>
                    {note.description && (
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{note.description}</p>
                    )}
                  </div>
                  {isMine && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => onRemindNote(note.id)} disabled={noteReminding === note.id}
                        className="p-1 text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                        <MdNotifications className={`text-sm ${noteReminding === note.id ? "animate-bounce" : ""}`} />
                      </button>
                      <button onClick={() => onEditNote(note)} className="p-1 text-gray-300 hover:text-amber-500 transition">
                        <MdEdit className="text-xs" />
                      </button>
                      <button onClick={() => onDeleteNote(note.id)} className="p-1 text-gray-300 hover:text-red-500 transition">
                        <MdDelete className="text-xs" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Untimed notes section */}
      {untimed.length > 0 && (
        <div className="mt-3 mb-2">
          <div className="text-[10px] text-amber-500 font-bold tracking-wider mb-1.5 flex items-center gap-1">
            <MdStickyNote2 className="text-xs" /> {t.schedule.notesNoTime}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {untimed.map((note) => {
              const isMine = note.userId === myUserId;
              const isPersonal = note.visibility === "personal";
              return (
                <div key={note.id}
                  className={`rounded-xl border-2 border-dashed p-2.5 transition ${isPersonal ? "bg-amber-50/80 border-amber-300" : "bg-orange-50/80 border-orange-300"}`}>
                  <div className="flex items-start gap-2">
                    <MdStickyNote2 className={`text-base shrink-0 mt-0.5 ${isPersonal ? "text-amber-400" : "text-orange-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-gray-800 truncate">{note.title}</span>
                        {!isMine && (
                          <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                            {note.user.name}
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isPersonal ? "text-amber-600 bg-amber-100" : "text-orange-600 bg-orange-100"}`}>
                          {isPersonal ? t.common.personal : t.common.team}
                        </span>
                      </div>
                      {note.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{note.description}</p>
                      )}
                    </div>
                    {isMine && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => onRemindNote(note.id)} disabled={noteReminding === note.id}
                          className="p-1 text-gray-300 hover:text-blue-500 transition disabled:opacity-50">
                          <MdNotifications className={`text-xs ${noteReminding === note.id ? "animate-bounce" : ""}`} />
                        </button>
                        <button onClick={() => onEditNote(note)} className="p-1 text-gray-300 hover:text-amber-500 transition">
                          <MdEdit className="text-xs" />
                        </button>
                        <button onClick={() => onDeleteNote(note.id)} className="p-1 text-gray-300 hover:text-red-500 transition">
                          <MdDelete className="text-xs" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
