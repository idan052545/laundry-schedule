"use client";

import { useState } from "react";
import {
  MdClose, MdSchedule, MdCancel, MdSwapHoriz, MdPersonAdd,
  MdWarning, MdContentCut, MdContentCopy, MdArrowBack,
  MdRemove, MdAdd, MdTimelapse,
} from "react-icons/md";
import { useLanguage } from "@/i18n";
import { israelDate } from "@/lib/israel-tz";
import type { ScheduleEvent, TeamMember, BaltamAction } from "./types";

interface Props {
  event: ScheduleEvent;
  teamMembers: TeamMember[];
  allEvents: ScheduleEvent[];
  onClose: () => void;
  onAction: (action: BaltamAction, payload: Record<string, unknown>) => Promise<{ ok: boolean; cascadeConflicts?: unknown[]; teamCollisions?: unknown[] }>;
  acting: boolean;
  date: string;
}

interface CollisionResolution {
  type: "shift-forward" | "trim-start" | "swap-times";
  label: string;
  newStartTime: string;
  newEndTime: string;
}

interface TeamCollision {
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  assignees: { id: string; name: string }[];
  overlapMinutes: number;
  resolutions: CollisionResolution[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

function toLocalISO(date: string, time: string) {
  return israelDate(date, time).toISOString();
}

function addMinutesToISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

type ActionScreen = null | "reschedule" | "cancel" | "swap" | "reassign" | "shorten" | "extend" | "delay" | "split" | "duplicate";

export default function BaltamSheet({ event, teamMembers, allEvents, onClose, onAction, acting, date }: Props) {
  const { t } = useLanguage();
  const [screen, setScreen] = useState<ActionScreen>(null);
  const [newStart, setNewStart] = useState(fmt(event.startTime));
  const [newEnd, setNewEnd] = useState(fmt(event.endTime));
  const [reason, setReason] = useState("");
  const [swapEventId, setSwapEventId] = useState("");
  const [oldUserId, setOldUserId] = useState(event.assignees[0]?.userId || "");
  const [newUserId, setNewUserId] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [splitTime, setSplitTime] = useState("");
  const [group1, setGroup1] = useState<string[]>([]);
  const [group2, setGroup2] = useState<string[]>([]);
  const [cascadeConflicts, setCascadeConflicts] = useState<unknown[] | null>(null);
  const [teamCollisions, setTeamCollisions] = useState<TeamCollision[] | null>(null);
  // Track which resolution the user picked for each collision
  const [pickedResolutions, setPickedResolutions] = useState<Record<string, { newStartTime: string; newEndTime: string }>>({});

  const swappableEvents = allEvents.filter(e => e.id !== event.id && e.target !== "all" && !e.allDay);
  const durationMin = Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000);

  // --- Action handlers ---

  function handleCollisionResult(result: { ok: boolean; cascadeConflicts?: unknown[]; teamCollisions?: unknown[] }) {
    if (result.teamCollisions && result.teamCollisions.length > 0) {
      const collisions = result.teamCollisions as TeamCollision[];
      setTeamCollisions(collisions);
      // Auto-select "shift-forward" as default resolution for each
      const defaults: Record<string, { newStartTime: string; newEndTime: string }> = {};
      for (const c of collisions) {
        const shift = c.resolutions.find(r => r.type === "shift-forward");
        if (shift) defaults[c.eventId] = { newStartTime: shift.newStartTime, newEndTime: shift.newEndTime };
      }
      setPickedResolutions(defaults);
    } else if (result.cascadeConflicts) {
      setCascadeConflicts(result.cascadeConflicts);
    } else if (result.ok) {
      onClose();
    }
  }

  async function handleReschedule(force = false) {
    const autoResolve = Object.keys(pickedResolutions).length > 0
      ? Object.entries(pickedResolutions).map(([eventId, times]) => ({ eventId, ...times }))
      : undefined;
    const result = await onAction("reschedule", {
      eventId: event.id,
      newStartTime: toLocalISO(date, newStart),
      newEndTime: toLocalISO(date, newEnd),
      reason: reason || undefined,
      force,
      autoResolve,
    });
    handleCollisionResult(result);
  }

  async function handleDelay() {
    const result = await onAction("reschedule", {
      eventId: event.id,
      newStartTime: addMinutesToISO(event.startTime, minutes),
      newEndTime: addMinutesToISO(event.endTime, minutes),
      reason: reason || `דחייה ב-${minutes} דק'`,
    });
    if (result.teamCollisions || result.cascadeConflicts) {
      setScreen("reschedule");
      setNewStart(fmt(addMinutesToISO(event.startTime, minutes)));
      setNewEnd(fmt(addMinutesToISO(event.endTime, minutes)));
    }
    handleCollisionResult(result);
  }

  async function handleShorten() {
    const result = await onAction("reschedule", {
      eventId: event.id,
      newStartTime: event.startTime,
      newEndTime: addMinutesToISO(event.endTime, -minutes),
      reason: reason || `קוצר ב-${minutes} דק'`,
    });
    handleCollisionResult(result);
  }

  async function handleExtend() {
    const result = await onAction("reschedule", {
      eventId: event.id,
      newStartTime: event.startTime,
      newEndTime: addMinutesToISO(event.endTime, minutes),
      reason: reason || `הוארך ב-${minutes} דק'`,
    });
    handleCollisionResult(result);
  }

  async function applyWithResolutions() {
    const autoResolve = Object.entries(pickedResolutions).map(([eventId, times]) => ({ eventId, ...times }));
    const result = await onAction("reschedule", {
      eventId: event.id,
      newStartTime: toLocalISO(date, newStart),
      newEndTime: toLocalISO(date, newEnd),
      reason: reason || undefined,
      force: true,
      autoResolve,
    });
    if (result.ok) onClose();
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

  async function handleSplit() {
    if (!splitTime || group1.length === 0 || group2.length === 0) return;
    const result = await onAction("split", {
      eventId: event.id,
      splitTime: toLocalISO(date, splitTime),
      assigneesGroup1: group1,
      assigneesGroup2: group2,
      reason: reason || undefined,
    });
    if (result.ok) onClose();
  }

  async function handleDuplicate() {
    const result = await onAction("duplicate", {
      eventId: event.id,
      newStartTime: toLocalISO(date, newStart),
      newEndTime: toLocalISO(date, newEnd),
      reason: reason || undefined,
    });
    if (result.ok) onClose();
  }

  // --- Quick actions grid ---
  const actions: { key: ActionScreen; icon: typeof MdSchedule; label: string; color: string; bg: string }[] = [
    { key: "delay", icon: MdTimelapse, label: t.mamash.baltamDelayStart, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "shorten", icon: MdRemove, label: t.mamash.baltamShorten, color: "text-orange-600", bg: "bg-orange-50" },
    { key: "extend", icon: MdAdd, label: t.mamash.baltamExtend, color: "text-green-600", bg: "bg-green-50" },
    { key: "reschedule", icon: MdSchedule, label: t.mamash.baltamMove, color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "reassign", icon: MdPersonAdd, label: t.mamash.baltamReassign, color: "text-teal-600", bg: "bg-teal-50" },
    { key: "swap", icon: MdSwapHoriz, label: t.mamash.baltamSwap, color: "text-purple-600", bg: "bg-purple-50" },
    { key: "split", icon: MdContentCut, label: t.mamash.baltamSplit, color: "text-amber-600", bg: "bg-amber-50" },
    { key: "duplicate", icon: MdContentCopy, label: t.mamash.baltamDuplicate, color: "text-cyan-600", bg: "bg-cyan-50" },
    { key: "cancel", icon: MdCancel, label: t.mamash.baltamCancel, color: "text-red-600", bg: "bg-red-50" },
  ];

  // --- Minute picker helper ---
  const minuteOptions = [5, 10, 15, 20, 30];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {screen && (
              <button onClick={() => { setScreen(null); setCascadeConflicts(null); setTeamCollisions(null); setPickedResolutions({}); }} className="p-1 text-gray-400 hover:text-gray-600">
                <MdArrowBack className="text-lg" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-bold text-gray-800">{t.mamash.baltamTitle}</h3>
              <p className="text-[10px] text-gray-500">{event.title} · {fmt(event.startTime)}–{fmt(event.endTime)} ({durationMin} {t.mamash.minutes})</p>
              {event.assignees.length > 0 && (
                <p className="text-[10px] text-gray-400">{event.assignees.map(a => a.user.name.split(" ")[0]).join(", ")}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Team collision resolution UI */}
        {teamCollisions && teamCollisions.length > 0 && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <MdWarning className="text-amber-500 text-sm" />
              <span className="text-xs font-bold text-amber-800">
                {teamCollisions.length} התנגשויות — בחר פתרון לכל אחת:
              </span>
            </div>

            {teamCollisions.map(c => (
              <div key={c.eventId} className="bg-white rounded-lg p-2.5 border border-amber-100">
                <div className="text-xs font-bold text-gray-800">{c.eventTitle}</div>
                <div className="text-[10px] text-gray-500" dir="ltr">
                  {fmt(c.startTime)}–{fmt(c.endTime)} · חפיפה {c.overlapMinutes} דק&apos;
                  {c.assignees.length > 0 && ` · ${c.assignees.map(a => a.name.split(" ")[0]).join(", ")}`}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.resolutions.map(r => {
                    const isSelected = pickedResolutions[c.eventId]?.newStartTime === r.newStartTime
                      && pickedResolutions[c.eventId]?.newEndTime === r.newEndTime;
                    return (
                      <button
                        key={r.type}
                        onClick={() => setPickedResolutions(prev => ({
                          ...prev,
                          [c.eventId]: { newStartTime: r.newStartTime, newEndTime: r.newEndTime },
                        }))}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {r.label}
                        <span className="font-normal mr-1" dir="ltr">
                          ({fmt(r.newStartTime)}–{fmt(r.newEndTime)})
                        </span>
                      </button>
                    );
                  })}
                  {/* Option to skip / keep overlap */}
                  <button
                    onClick={() => setPickedResolutions(prev => {
                      const next = { ...prev };
                      delete next[c.eventId];
                      return next;
                    })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      !pickedResolutions[c.eventId] ? "bg-gray-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    השאר חפיפה
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={applyWithResolutions}
              disabled={acting}
              className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:opacity-50"
            >
              בצע שינוי + סדר {Object.keys(pickedResolutions).length > 0 ? `(${Object.keys(pickedResolutions).length} יוזזו)` : ""}
            </button>
          </div>
        )}

        {/* Legacy cascade conflicts warning (assignee-level) */}
        {!teamCollisions && cascadeConflicts && cascadeConflicts.length > 0 && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
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

        <div className="p-4">
          {/* Action picker grid */}
          {!screen && (
            <div className="grid grid-cols-3 gap-2">
              {actions.map(a => (
                <button
                  key={a.key}
                  onClick={() => setScreen(a.key)}
                  className={`${a.bg} rounded-xl p-3 flex flex-col items-center gap-1.5 hover:opacity-80 transition`}
                >
                  <a.icon className={`text-xl ${a.color}`} />
                  <span className={`text-[10px] font-bold ${a.color}`}>{a.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* === DELAY START === */}
          {screen === "delay" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">{t.mamash.delayMinutes}</p>
              <div className="flex gap-2 flex-wrap">
                {minuteOptions.map(m => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      minutes === m ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    +{m} דק&apos;
                  </button>
                ))}
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-[10px] text-blue-700" dir="ltr">
                {fmt(event.startTime)}–{fmt(event.endTime)} → {fmt(addMinutesToISO(event.startTime, minutes))}–{fmt(addMinutesToISO(event.endTime, minutes))}
              </div>
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={handleDelay} disabled={acting}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:opacity-50">
                {t.mamash.baltamDelayStart} +{minutes} דק&apos;
              </button>
            </div>
          )}

          {/* === SHORTEN === */}
          {screen === "shorten" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">{t.mamash.shortenMinutes}</p>
              <div className="flex gap-2 flex-wrap">
                {minuteOptions.filter(m => m < durationMin).map(m => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      minutes === m ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    -{m} דק&apos;
                  </button>
                ))}
              </div>
              <div className="bg-orange-50 rounded-lg p-2 text-[10px] text-orange-700" dir="ltr">
                {fmt(event.startTime)}–{fmt(event.endTime)} ({durationMin} דק&apos;) → {fmt(event.startTime)}–{fmt(addMinutesToISO(event.endTime, -minutes))} ({durationMin - minutes} דק&apos;)
              </div>
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={handleShorten} disabled={acting || minutes >= durationMin}
                className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:opacity-50">
                {t.mamash.baltamShorten} {minutes} דק&apos;
              </button>
            </div>
          )}

          {/* === EXTEND === */}
          {screen === "extend" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">{t.mamash.extendMinutes}</p>
              <div className="flex gap-2 flex-wrap">
                {minuteOptions.map(m => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      minutes === m ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    +{m} דק&apos;
                  </button>
                ))}
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-[10px] text-green-700" dir="ltr">
                {fmt(event.startTime)}–{fmt(event.endTime)} ({durationMin} דק&apos;) → {fmt(event.startTime)}–{fmt(addMinutesToISO(event.endTime, minutes))} ({durationMin + minutes} דק&apos;)
              </div>
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={handleExtend} disabled={acting}
                className="w-full py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 disabled:opacity-50">
                {t.mamash.baltamExtend} {minutes} דק&apos;
              </button>
            </div>
          )}

          {/* === RESCHEDULE (full) === */}
          {screen === "reschedule" && (
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
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={() => handleReschedule()} disabled={acting}
                className="w-full py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 disabled:opacity-50">
                {t.mamash.baltamMove}
              </button>
            </div>
          )}

          {/* === REASSIGN === */}
          {screen === "reassign" && (
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
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={handleReassign} disabled={acting || !oldUserId || !newUserId}
                className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-xs font-bold hover:bg-teal-600 disabled:opacity-50">
                {t.mamash.baltamReassign}
              </button>
            </div>
          )}

          {/* === SWAP === */}
          {screen === "swap" && (
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
              <button onClick={handleSwap} disabled={acting || !swapEventId}
                className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 disabled:opacity-50">
                {t.mamash.baltamSwap}
              </button>
            </div>
          )}

          {/* === SPLIT === */}
          {screen === "split" && (
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
              <button onClick={handleSplit} disabled={acting || !splitTime || group1.length === 0 || group2.length === 0}
                className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 disabled:opacity-50">
                {t.mamash.baltamSplit}
              </button>
            </div>
          )}

          {/* === DUPLICATE === */}
          {screen === "duplicate" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">{t.mamash.duplicateTime}</p>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newStart}</span>
                  <input type="time" value={newStart} onChange={e => {
                    setNewStart(e.target.value);
                    // Auto-set end based on original duration
                    const start = israelDate(date, e.target.value);
                    const end = new Date(start.getTime() + durationMin * 60000);
                    const endIL = end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
                    setNewEnd(endIL);
                  }}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                </label>
                <label>
                  <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newEnd}</span>
                  <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                </label>
              </div>
              <div className="bg-cyan-50 rounded-lg p-2 text-[10px] text-cyan-700">
                עותק של &quot;{event.title}&quot; עם אותם משובצים
              </div>
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={handleDuplicate} disabled={acting}
                className="w-full py-2.5 bg-cyan-500 text-white rounded-xl text-xs font-bold hover:bg-cyan-600 disabled:opacity-50">
                {t.mamash.baltamDuplicate}
              </button>
            </div>
          )}

          {/* === CANCEL === */}
          {screen === "cancel" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">{t.mamash.cancelConfirm}</p>
              {event.assignees.length > 0 && (
                <div className="bg-red-50 rounded-lg p-2">
                  <span className="text-[10px] text-gray-500">{t.mamash.affectedPeople}:</span>
                  <div className="text-xs text-gray-700 mt-1">{event.assignees.map(a => a.user.name).join(", ")}</div>
                </div>
              )}
              <ReasonInput reason={reason} setReason={setReason} t={t} />
              <button onClick={handleCancel} disabled={acting}
                className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 disabled:opacity-50">
                {t.mamash.baltamCancel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReasonInput({ reason, setReason, t }: { reason: string; setReason: (s: string) => void; t: ReturnType<typeof useLanguage>["t"] }) {
  return (
    <label>
      <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.mamash.reasonPlaceholder}
        className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
    </label>
  );
}
