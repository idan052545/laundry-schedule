"use client";

import { useState, useEffect } from "react";
import { MdSwapHoriz, MdAutoAwesome, MdPersonOff, MdStar, MdWarning, MdAccessTime } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { Assignment, UserMin } from "./constants";
import { displayName } from "@/lib/displayName";

interface Candidate {
  id: string;
  name: string;
  nameEn?: string | null;
  team: number | null;
  image: string | null;
  roomNumber: string | null;
  hours: number;
  debt: number;
  isBusy: boolean;
  isAssignedToday: boolean;
  score: number;
}

interface SwapModalProps {
  swapping: Assignment;
  swapUserId: string;
  setSwapUserId: (v: string) => void;
  allUsers: UserMin[];
  submitting: boolean;
  onClose: () => void;
  onSwap: () => void;
  onRemove?: () => void;
}

export default function SwapModal({ swapping, swapUserId, setSwapUserId, allUsers, submitting, onClose, onSwap, onRemove }: SwapModalProps) {
  const { t, locale } = useLanguage();
  const [suggestions, setSuggestions] = useState<Candidate[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Fetch smart suggestions on mount
  useEffect(() => {
    async function fetchSuggestions() {
      setLoadingSuggestions(true);
      try {
        const res = await fetch("/api/guard-duty/suggest-replacement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId: swapping.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.candidates || []);
        }
      } catch { /* ignore */ }
      setLoadingSuggestions(false);
    }
    if (swapping.id) fetchSuggestions();
  }, [swapping.id]);

  const availableSuggestions = suggestions.filter(c => !c.isBusy);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl space-y-3 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <MdSwapHoriz className="text-blue-500" /> {t.guardDuty.swapSoldier}
        </h3>

        {/* Current assignment info */}
        <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
          <div>{t.guardDuty.current}: <strong>{displayName(swapping.user, locale)}</strong></div>
          <div>{t.guardDuty.role}: <strong>{swapping.role}</strong></div>
          <div>{t.guardDuty.shiftLabel}: <strong>{swapping.note || swapping.timeSlot}</strong></div>
        </div>

        {/* Smart suggestions */}
        {loadingSuggestions ? (
          <div className="text-center py-3 text-xs text-gray-400">{t.guardDuty.findingReplacements}...</div>
        ) : availableSuggestions.length > 0 ? (
          <div>
            <div className="text-[10px] font-bold text-indigo-600 mb-1.5 flex items-center gap-1">
              <MdAutoAwesome className="text-xs" /> {t.guardDuty.suggestedReplacements}
            </div>
            <div className="space-y-1">
              {availableSuggestions.slice(0, 5).map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSwapUserId(c.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition border ${
                    swapUserId === c.id
                      ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
                      : "bg-white border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  {i === 0 && <MdStar className="text-amber-400 text-sm shrink-0" />}
                  <span className="font-medium text-gray-700 flex-1 text-start">{c.name}</span>
                  {c.team && <span className="text-[9px] text-gray-400">{t.common.team} {c.team}</span>}
                  <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                    <MdAccessTime className="text-[10px]" /> {c.hours.toFixed(0)}h
                  </span>
                  {c.isAssignedToday && (
                    <span className="text-[8px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded">{t.guardDuty.alreadyToday}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Full user list (expandable) */}
        {!showAllUsers ? (
          <button
            onClick={() => setShowAllUsers(true)}
            className="w-full text-[10px] text-indigo-500 hover:text-indigo-700 py-1"
          >
            {t.guardDuty.showAllUsers} ▾
          </button>
        ) : (
          <select value={swapUserId} onChange={e => setSwapUserId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">{t.guardDuty.selectNewSoldier}</option>
            {allUsers.filter(u => u.id !== swapping.userId).map(u => (
              <option key={u.id} value={u.id}>{displayName(u, locale)} {u.team ? `(${t.common.team} ${u.team})` : ""}</option>
            ))}
          </select>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-between pt-1 border-t border-gray-100">
          {onRemove && (
            <button onClick={onRemove} disabled={submitting}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition border border-red-200 disabled:opacity-50">
              <MdPersonOff /> {t.guardDuty.removeFromDuty}
            </button>
          )}
          <div className="flex gap-2 ms-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">{t.common.cancel}</button>
            <button onClick={onSwap} disabled={!swapUserId || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
              <MdSwapHoriz /> {submitting ? t.guardDuty.swapping : t.guardDuty.swapAndNotify}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
