"use client";

import { MdEdit } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface DisputeModalProps {
  showDispute: string;
  disputeForm: { claimedStartTime: string; claimedEndTime: string; reason: string };
  setDisputeForm: React.Dispatch<React.SetStateAction<{ claimedStartTime: string; claimedEndTime: string; reason: string }>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (requestId: string) => void;
}

export default function DisputeModal({
  showDispute, disputeForm, setDisputeForm, submitting, onClose, onSubmit,
}: DisputeModalProps) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdEdit className="text-amber-500" /> {t.volunteers.disputeTitle}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t.volunteers.actualStart}</label>
            <input type="datetime-local" value={disputeForm.claimedStartTime} onChange={e => setDisputeForm(f => ({ ...f, claimedStartTime: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t.volunteers.actualEnd}</label>
            <input type="datetime-local" value={disputeForm.claimedEndTime} onChange={e => setDisputeForm(f => ({ ...f, claimedEndTime: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <textarea value={disputeForm.reason} onChange={e => setDisputeForm(f => ({ ...f, reason: e.target.value }))}
            placeholder={t.volunteers.disputeReason} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSubmit(showDispute)} disabled={submitting || !disputeForm.claimedStartTime || !disputeForm.claimedEndTime}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50">
            {submitting ? t.common.sending : t.volunteers.sendDispute}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">{t.common.cancel}</button>
        </div>
      </div>
    </div>
  );
}
