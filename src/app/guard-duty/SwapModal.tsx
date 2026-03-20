"use client";

import { MdSwapHoriz } from "react-icons/md";
import { Assignment, UserMin } from "./constants";

interface SwapModalProps {
  swapping: Assignment;
  swapUserId: string;
  setSwapUserId: (v: string) => void;
  allUsers: UserMin[];
  submitting: boolean;
  onClose: () => void;
  onSwap: () => void;
}

export default function SwapModal({ swapping, swapUserId, setSwapUserId, allUsers, submitting, onClose, onSwap }: SwapModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <MdSwapHoriz className="text-blue-500" /> החלף חייל
        </h3>
        <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
          <div>נוכחי: <strong>{swapping.user.name}</strong></div>
          <div>תפקיד: <strong>{swapping.role}</strong></div>
          <div>משמרת: <strong>{swapping.timeSlot}</strong></div>
        </div>
        <select value={swapUserId} onChange={e => setSwapUserId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="">בחר חייל חדש</option>
          {allUsers.filter(u => u.id !== swapping.userId).map(u => (
            <option key={u.id} value={u.id}>{u.name} {u.team ? `(צוות ${u.team})` : ""}</option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
          <button onClick={onSwap} disabled={!swapUserId || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
            <MdSwapHoriz /> {submitting ? "מחליף..." : "החלף ושלח התראה"}
          </button>
        </div>
      </div>
    </div>
  );
}
