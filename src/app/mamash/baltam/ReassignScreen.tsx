"use client";

import type { useLanguage } from "@/i18n";
import type { ScheduleEvent, TeamMember } from "../types";
import ReasonInput from "./ReasonInput";

interface Props {
  event: ScheduleEvent;
  teamMembers: TeamMember[];
  oldUserId: string;
  setOldUserId: (s: string) => void;
  newUserId: string;
  setNewUserId: (s: string) => void;
  reason: string;
  setReason: (s: string) => void;
  onReassign: () => void;
  acting: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function ReassignScreen({ event, teamMembers, oldUserId, setOldUserId, newUserId, setNewUserId, reason, setReason, onReassign, acting, t }: Props) {
  return (
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
      <button onClick={onReassign} disabled={acting || !oldUserId || !newUserId}
        className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-xs font-bold hover:bg-teal-600 disabled:opacity-50">
        {t.mamash.baltamReassign}
      </button>
    </div>
  );
}
