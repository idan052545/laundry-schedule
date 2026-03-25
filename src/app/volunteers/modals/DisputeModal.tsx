"use client";

import { MdEdit, MdLock, MdAccessTime } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface DisputeModalProps {
  showDispute: string;
  disputeForm: { claimedStartTime: string; claimedEndTime: string; reason: string; originalStartTime: string; originalEndTime: string };
  setDisputeForm: React.Dispatch<React.SetStateAction<{ claimedStartTime: string; claimedEndTime: string; reason: string; originalStartTime: string; originalEndTime: string }>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (requestId: string) => void;
}

export default function DisputeModal({
  showDispute, disputeForm, setDisputeForm, submitting, onClose, onSubmit,
}: DisputeModalProps) {
  const { t } = useLanguage();

  const changed = disputeForm.claimedEndTime !== disputeForm.originalEndTime;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
          <MdEdit className="text-amber-500" /> {t.volunteers.disputeTitle}
        </h2>
        <p className="text-[10px] text-gray-400 mb-4">{t.volunteers.disputeDesc || "עדכון שעת הסיום בפועל — שעת ההתחלה נשארת כפי שנקבעה"}</p>

        <div className="space-y-3">
          {/* Start time — locked */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <MdLock className="text-[10px] text-gray-400" /> {t.volunteers.actualStart}
            </label>
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl border border-gray-200 px-3 py-2.5">
              <MdAccessTime className="text-gray-400 text-sm" />
              <span className="text-sm font-bold text-gray-500 tabular-nums">{disputeForm.claimedStartTime}</span>
              <span className="text-[9px] text-gray-400 mr-auto">{t.volunteers.lockedStart || "נעול"}</span>
            </div>
          </div>

          {/* End time — editable, time-only */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <MdAccessTime className="text-[10px] text-amber-500" /> {t.volunteers.actualEnd}
            </label>
            <input
              type="time"
              value={disputeForm.claimedEndTime}
              onChange={e => setDisputeForm(f => ({ ...f, claimedEndTime: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm text-center font-bold tabular-nums transition focus:ring-2 focus:ring-amber-300 ${
                changed ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-700"
              }`}
            />
            {changed && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-gray-400 line-through">{disputeForm.originalEndTime}</span>
                <span className="text-[10px] text-amber-600 font-bold">→ {disputeForm.claimedEndTime}</span>
              </div>
            )}
          </div>

          {/* Reason — optional */}
          <textarea
            value={disputeForm.reason}
            onChange={e => setDisputeForm(f => ({ ...f, reason: e.target.value }))}
            placeholder={t.volunteers.disputeReason}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-amber-300 transition"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSubmit(showDispute)}
            disabled={submitting || !changed}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50"
          >
            {submitting ? t.common.sending : t.volunteers.sendDispute}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
