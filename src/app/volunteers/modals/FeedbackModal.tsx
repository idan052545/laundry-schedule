"use client";

import { MdStar, MdStarBorder } from "react-icons/md";
import { FEEDBACK_TYPES } from "../constants";

interface FeedbackModalProps {
  showFeedback: string;
  feedbackForm: { rating: number; type: string; comment: string };
  setFeedbackForm: React.Dispatch<React.SetStateAction<{ rating: number; type: string; comment: string }>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (requestId: string) => void;
}

export default function FeedbackModal({
  showFeedback, feedbackForm, setFeedbackForm, submitting, onClose, onSubmit,
}: FeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdStar className="text-purple-500" /> דירוג התורנות</h2>
        <div className="flex justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setFeedbackForm(f => ({ ...f, rating: n }))}
              className="text-3xl transition hover:scale-110">
              {n <= feedbackForm.rating ? <MdStar className="text-amber-400" /> : <MdStarBorder className="text-gray-300" />}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 justify-center mb-3">
          {FEEDBACK_TYPES.map(t => (
            <button key={t.value} onClick={() => setFeedbackForm(f => ({ ...f, type: t.value }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                feedbackForm.type === t.value ? "bg-purple-600 text-white border-purple-600" : "bg-gray-50 border-gray-200 text-gray-600"
              }`}>
              <t.icon className="inline text-sm" /> {t.label}
            </button>
          ))}
        </div>
        <textarea value={feedbackForm.comment} onChange={e => setFeedbackForm(f => ({ ...f, comment: e.target.value }))}
          placeholder="משהו נוסף?" rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none mb-3" />
        <div className="flex gap-2">
          <button onClick={() => onSubmit(showFeedback)} disabled={submitting || feedbackForm.rating === 0}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50">
            {submitting ? "שולח..." : "שלח דירוג"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">ביטול</button>
        </div>
      </div>
    </div>
  );
}
