"use client";

import { MdGavel, MdCheck, MdClose } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { Appeal } from "./constants";

interface AppealsPanelProps {
  appeals: Appeal[];
  submitting: boolean;
  onResolve: (appealId: string, approved: boolean) => void;
}

export default function AppealsPanel({ appeals, submitting, onResolve }: AppealsPanelProps) {
  const pending = appeals.filter(a => a.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="bg-red-50 rounded-2xl border border-red-200 p-4 mb-6 space-y-3">
      <h3 className="font-bold text-red-700 flex items-center gap-2 text-sm"><MdGavel /> ערעורים ממתינים</h3>
      {pending.map(appeal => (
        <div key={appeal.id} className="bg-white rounded-xl p-3 border border-red-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar name={appeal.user.name} image={appeal.user.image} size="sm" />
            <div className="min-w-0">
              <span className="font-bold text-sm text-gray-800">{appeal.user.name}</span>
              <p className="text-xs text-gray-500 truncate">{appeal.reason || "ללא סיבה"}</p>
              {appeal.suggestedUser && (
                <span className="text-[10px] text-blue-600 font-medium">מציע: {appeal.suggestedUser.name}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onResolve(appeal.id, true)} disabled={submitting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 disabled:opacity-50">
              <MdCheck /> אשר
            </button>
            <button onClick={() => onResolve(appeal.id, false)} disabled={submitting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50">
              <MdClose /> דחה
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
