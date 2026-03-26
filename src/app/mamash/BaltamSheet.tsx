"use client";

import { useState } from "react";
import { MdClose, MdSchedule, MdCancel, MdSwapHoriz, MdPersonAdd, MdWarning } from "react-icons/md";
import { useLanguage } from "@/i18n";
import type { ScheduleEvent, TeamMember, BaltamAction } from "./types";

interface Props {
  event: ScheduleEvent;
  teamMembers: TeamMember[];
  allEvents: ScheduleEvent[];
  onClose: () => void;
  onAction: (action: BaltamAction, payload: Record<string, unknown>) => Promise<{ ok: boolean; cascadeConflicts?: unknown[] }>;
  acting: boolean;
  date: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

function toLocalISO(date: string, time: string) {
  // Convert HH:MM on a date to ISO with Israel offset
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date + "T00:00:00+03:00");
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export default function BaltamSheet({ event, teamMembers, allEvents, onClose, onAction, acting, date }: Props) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"reschedule" | "cancel" | "swap" | "reassign">("reschedule");
  const [newStart, setNewStart] = useState(fmt(event.startTime));
  const [newEnd, setNewEnd] = useState(fmt(event.endTime));
  const [reason, setReason] = useState("");
  const [swapEventId, setSwapEventId] = useState("");
  const [oldUserId, setOldUserId] = useState(event.assignees[0]?.userId || "");
  const [newUserId, setNewUserId] = useState("");
  const [cascadeConflicts, setCascadeConflicts] = useState<unknown[] | null>(null);

  const tabs: { key: typeof tab; icon: typeof MdSchedule; label: string }[] = [
    { key: "reschedule", icon: MdSchedule, label: t.mamash.baltamMove },
    { key: "cancel", icon: MdCancel, label: t.mamash.baltamCancel },
    { key: "swap", icon: MdSwapHoriz, label: t.mamash.baltamSwap },
    { key: "reassign", icon: MdPersonAdd, label: t.mamash.baltamReassign },
  ];

  async function handleReschedule(force = false) {
    const result = await onAction("reschedule", {
      eventId: event.id,
      newStartTime: toLocalISO(date, newStart),
      newEndTime: toLocalISO(date, newEnd),
      reason: reason || undefined,
      force,
    });
    if (result.cascadeConflicts) {
      setCascadeConflicts(result.cascadeConflicts);
    } else if (result.ok) {
      onClose();
    }
  }

  async function handleCancel() {
    const result = await onAction("cancel", { eventId: event.id, reason: reason || undefined });
    if (result.ok) onClose();
  }

  async function handleSwap() {
    if (!swapEventId) return;
    const result = await onAction("swap", { eventId1: event.id, eventId2: swapEventId, reason: reason || undefined });
    if (result.ok) onClose();
  }

  async function handleReassign() {
    if (!oldUserId || !newUserId) return;
    const result = await onAction("reassign", { eventId: event.id, oldUserId, newUserId, reason: reason || undefined });
    if (result.ok) onClose();
  }

  // Other team events for swap
  const swappableEvents = allEvents.filter(e => e.id !== event.id && e.target !== "all" && !e.allDay);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{t.mamash.baltamTitle}</h3>
            <p className="text-[10px] text-gray-500">{event.title} · {fmt(event.startTime)}–{fmt(event.endTime)}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => { setTab(tb.key); setCascadeConflicts(null); }}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition ${
                tab === tb.key ? "text-dotan-green border-b-2 border-dotan-green" : "text-gray-400"
              }`}
            >
              <tb.icon className="text-xs" /> {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Cascade conflicts warning */}
          {cascadeConflicts && cascadeConflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MdWarning className="text-amber-500 text-sm" />
                <span className="text-xs font-bold text-amber-800">{t.mamash.conflictWarning}</span>
              </div>
              {(cascadeConflicts as Array<{ eventTitle: string; affectedUsers: { name: string }[] }>).map((c, i) => (
                <div key={i} className="text-[10px] text-amber-700 mt-1">
                  {c.eventTitle} — {c.affectedUsers.map(u => u.name).join(", ")}
                </div>
              ))}
              <button
                onClick={() => handleReschedule(true)}
                disabled={acting}
                className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-lg hover:bg-amber-200"
              >
                {t.mamash.forceMove}
              </button>
            </div>
          )}

          {tab === "reschedule" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newStart}</span>
                  <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                </label>
                <label>
                  <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newEnd}</span>
                  <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                </label>
              </div>
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.mamash.reasonPlaceholder}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </label>
              <button onClick={() => handleReschedule()} disabled={acting}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:opacity-50">
                {t.mamash.baltamMove}
              </button>
            </div>
          )}

          {tab === "cancel" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">{t.mamash.cancelConfirm}</p>
              {event.assignees.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <span className="text-[10px] text-gray-500">{t.mamash.affectedPeople}:</span>
                  <div className="text-xs text-gray-700 mt-1">{event.assignees.map(a => a.user.name).join(", ")}</div>
                </div>
              )}
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.mamash.reasonPlaceholder}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </label>
              <button onClick={handleCancel} disabled={acting}
                className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-50">
                {t.mamash.baltamCancel}
              </button>
            </div>
          )}

          {tab === "swap" && (
            <div className="space-y-3">
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.swapWith}</span>
                <select value={swapEventId} onChange={e => setSwapEventId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <option value="">{t.mamash.selectEvent}</option>
                  {swappableEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.title} ({fmt(e.startTime)}–{fmt(e.endTime)})</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.mamash.reasonPlaceholder}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </label>
              <button onClick={handleSwap} disabled={acting || !swapEventId}
                className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 disabled:opacity-50">
                {t.mamash.baltamSwap}
              </button>
            </div>
          )}

          {tab === "reassign" && (
            <div className="space-y-3">
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.removeUser}</span>
                <select value={oldUserId} onChange={e => setOldUserId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <option value="">{t.mamash.selectPerson}</option>
                  {event.assignees.map(a => (
                    <option key={a.userId} value={a.userId}>{a.user.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.addUser}</span>
                <select value={newUserId} onChange={e => setNewUserId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <option value="">{t.mamash.selectPerson}</option>
                  {teamMembers
                    .filter(m => !event.assignees.some(a => a.userId === m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
              </label>
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.mamash.reasonPlaceholder}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </label>
              <button onClick={handleReassign} disabled={acting || !oldUserId || !newUserId}
                className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-xs font-bold hover:bg-teal-600 disabled:opacity-50">
                {t.mamash.baltamReassign}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
