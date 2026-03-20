"use client";

import { MdGavel, MdNotifications } from "react-icons/md";
import { Assignment, UserMin } from "./constants";

interface AppealModalProps {
  appealing: Assignment;
  appealReason: string;
  setAppealReason: (v: string) => void;
  appealSuggestion: string;
  setAppealSuggestion: (v: string) => void;
  allUsers: UserMin[];
  userId: string | null;
  submitting: boolean;
  onClose: () => void;
  onAppeal: () => void;
}

export default function AppealModal({
  appealing, appealReason, setAppealReason, appealSuggestion, setAppealSuggestion,
  allUsers, userId, submitting, onClose, onAppeal,
}: AppealModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <MdGavel className="text-red-500" /> ערעור על שיבוץ
        </h3>
        <div className="bg-red-50 rounded-xl p-3 text-xs space-y-1">
          <div>תפקיד: <strong>{appealing.role}</strong></div>
          <div>משמרת: <strong>{appealing.timeSlot}</strong></div>
        </div>
        <textarea value={appealReason} onChange={e => setAppealReason(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none min-h-[80px]"
          placeholder="סיבה לערעור..." />
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">הצע מחליף (אופציונלי)</label>
          <select value={appealSuggestion} onChange={e => setAppealSuggestion(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">ללא הצעה</option>
            {allUsers.filter(u => u.id !== userId).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
          <button onClick={onAppeal} disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
            <MdNotifications /> {submitting ? "שולח..." : "שלח ערעור"}
          </button>
        </div>
      </div>
    </div>
  );
}
