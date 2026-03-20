"use client";

import { MdSwapHoriz } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface ReplaceModalProps {
  showReplace: string;
  replaceForm: { reason: string; isUrgent: boolean };
  setReplaceForm: React.Dispatch<React.SetStateAction<{ reason: string; isUrgent: boolean }>>;
  submitting: boolean;
  onClose: () => void;
  onReplace: (assignmentId: string) => void;
}

export default function ReplaceModal({
  showReplace, replaceForm, setReplaceForm, submitting, onClose, onReplace,
}: ReplaceModalProps) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdSwapHoriz className="text-orange-500" /> {t.volunteers.replaceTitle}</h2>
        <textarea value={replaceForm.reason} onChange={e => setReplaceForm(f => ({ ...f, reason: e.target.value }))}
          placeholder={t.volunteers.replaceReason} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none mb-3" />
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={replaceForm.isUrgent} onChange={e => setReplaceForm(f => ({ ...f, isUrgent: e.target.checked }))}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <span className="text-xs font-medium text-red-700">{t.volunteers.replaceUrgent}</span>
        </label>
        <div className="flex gap-2">
          <button onClick={() => onReplace(showReplace)} disabled={submitting}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 ${replaceForm.isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}>
            {submitting ? t.common.sending : t.volunteers.sendRequest}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">{t.common.cancel}</button>
        </div>
      </div>
    </div>
  );
}
