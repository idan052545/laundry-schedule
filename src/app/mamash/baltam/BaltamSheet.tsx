"use client";

import { useState } from "react";
import {
  MdClose, MdSchedule, MdCancel, MdSwapHoriz, MdPersonAdd,
  MdContentCut, MdContentCopy, MdArrowBack,
  MdRemove, MdAdd, MdTimelapse,
} from "react-icons/md";
import { useLanguage } from "@/i18n";
import { fmt, toLocalISO, addMinutesToISO } from "./utils";
import type { BaltamSheetProps, ActionScreen, TeamCollision } from "./types";
import { TeamCollisionPanel, CascadeConflictPanel } from "./CollisionPanel";
import DelayScreen from "./DelayScreen";
import ShortenScreen from "./ShortenScreen";
import ExtendScreen from "./ExtendScreen";
import RescheduleScreen from "./RescheduleScreen";
import ReassignScreen from "./ReassignScreen";
import SwapScreen from "./SwapScreen";
import SplitScreen from "./SplitScreen";
import DuplicateScreen from "./DuplicateScreen";
import CancelScreen from "./CancelScreen";

export default function BaltamSheet({ event, teamMembers, allEvents, onClose, onAction, acting, date }: BaltamSheetProps) {
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
  const [pickedResolutions, setPickedResolutions] = useState<Record<string, { newStartTime: string; newEndTime: string }>>({});

  const swappableEvents = allEvents.filter(e => e.id !== event.id && e.target !== "all" && !e.allDay);
  const durationMin = Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000);

  // --- Action handlers ---

  function handleCollisionResult(result: { ok: boolean; cascadeConflicts?: unknown[]; teamCollisions?: unknown[] }) {
    if (result.teamCollisions && result.teamCollisions.length > 0) {
      const collisions = result.teamCollisions as TeamCollision[];
      setTeamCollisions(collisions);
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
          <TeamCollisionPanel
            teamCollisions={teamCollisions}
            pickedResolutions={pickedResolutions}
            setPickedResolutions={setPickedResolutions}
            onApply={applyWithResolutions}
            acting={acting}
          />
        )}

        {/* Legacy cascade conflicts warning */}
        {!teamCollisions && cascadeConflicts && cascadeConflicts.length > 0 && (
          <CascadeConflictPanel
            cascadeConflicts={cascadeConflicts as Array<{ eventTitle: string; affectedUsers: { name: string }[] }>}
            onForce={() => handleReschedule(true)}
            acting={acting}
            t={t}
          />
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

          {screen === "delay" && (
            <DelayScreen event={event} minutes={minutes} setMinutes={setMinutes} reason={reason} setReason={setReason} onDelay={handleDelay} acting={acting} t={t} />
          )}
          {screen === "shorten" && (
            <ShortenScreen event={event} durationMin={durationMin} minutes={minutes} setMinutes={setMinutes} reason={reason} setReason={setReason} onShorten={handleShorten} acting={acting} t={t} />
          )}
          {screen === "extend" && (
            <ExtendScreen event={event} durationMin={durationMin} minutes={minutes} setMinutes={setMinutes} reason={reason} setReason={setReason} onExtend={handleExtend} acting={acting} t={t} />
          )}
          {screen === "reschedule" && (
            <RescheduleScreen newStart={newStart} setNewStart={setNewStart} newEnd={newEnd} setNewEnd={setNewEnd} reason={reason} setReason={setReason} onReschedule={() => handleReschedule()} acting={acting} t={t} />
          )}
          {screen === "reassign" && (
            <ReassignScreen event={event} teamMembers={teamMembers} oldUserId={oldUserId} setOldUserId={setOldUserId} newUserId={newUserId} setNewUserId={setNewUserId} reason={reason} setReason={setReason} onReassign={handleReassign} acting={acting} t={t} />
          )}
          {screen === "swap" && (
            <SwapScreen event={event} swappableEvents={swappableEvents} swapEventId={swapEventId} setSwapEventId={setSwapEventId} reason={reason} setReason={setReason} onSwap={handleSwap} acting={acting} t={t} />
          )}
          {screen === "split" && (
            <SplitScreen event={event} splitTime={splitTime} setSplitTime={setSplitTime} group1={group1} setGroup1={setGroup1} group2={group2} setGroup2={setGroup2} reason={reason} setReason={setReason} onSplit={handleSplit} acting={acting} t={t} />
          )}
          {screen === "duplicate" && (
            <DuplicateScreen event={event} date={date} durationMin={durationMin} newStart={newStart} setNewStart={setNewStart} newEnd={newEnd} setNewEnd={setNewEnd} reason={reason} setReason={setReason} onDuplicate={handleDuplicate} acting={acting} t={t} />
          )}
          {screen === "cancel" && (
            <CancelScreen event={event} reason={reason} setReason={setReason} onCancel={handleCancel} acting={acting} t={t} />
          )}
        </div>
      </div>
    </div>
  );
}
