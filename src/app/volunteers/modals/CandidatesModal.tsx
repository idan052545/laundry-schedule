"use client";

import { MdClose, MdCheck, MdStar } from "react-icons/md";
import { useEffect } from "react";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";
import { TEAM_COLORS } from "../constants";
import type { VolRequest, Candidate } from "../types";

interface CandidatesModalProps {
  selectedRequest: VolRequest;
  candidates: Candidate[];
  loadingCandidates: boolean;
  submitting: boolean;
  onClose: () => void;
  onAssign: (requestId: string, userId: string, type: string) => void;
}

export default function CandidatesModal({
  selectedRequest, candidates, loadingCandidates, submitting,
  onClose, onAssign,
}: CandidatesModalProps) {
  const { t, locale } = useLanguage();  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">{t.volunteers.candidatesTitle} {selectedRequest.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose className="text-lg" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loadingCandidates ? <InlineLoading /> : (
            <div className="space-y-2">
              {candidates.map(c => (
                <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                  c.isAssigned ? "bg-green-50 border-green-300" : c.isFree ? "bg-white border-gray-200 hover:border-green-300" : "bg-gray-50 border-gray-200"
                }`}>
                  <Avatar name={c.name} image={c.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{displayName(c, locale)}</span>
                      {c.team && <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${TEAM_COLORS[c.team] || TEAM_COLORS[0]}`}>{c.team}</span>}
                      {c.isAssigned && <span className="text-[8px] font-bold px-1 py-0.5 bg-green-200 text-green-800 rounded">{t.volunteers.alreadyAssigned}</span>}
                    </div>
                    {c.conflicts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.conflicts.map((cf, i) => (
                          <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border ${
                            cf.priority >= 3 ? "bg-red-50 border-red-200 text-red-700" :
                            cf.priority >= 2 ? "bg-amber-50 border-amber-200 text-amber-700" :
                            "bg-gray-50 border-gray-200 text-gray-600"
                          }`}>
                            {cf.title}
                          </span>
                        ))}
                      </div>
                    )}
                    {c.isFree && !c.isAssigned && <span className="text-[10px] text-green-600 font-medium">{t.volunteers.available}</span>}
                  </div>
                  {!c.isAssigned && (
                    <div className="flex gap-1">
                      <button onClick={() => onAssign(selectedRequest.id, c.id, "commander")} disabled={submitting}
                        title={t.volunteers.assignAsCommander}
                        className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition disabled:opacity-50">
                        <MdStar className="text-sm" />
                      </button>
                      <button onClick={() => onAssign(selectedRequest.id, c.id, "team-member")} disabled={submitting}
                        title={t.volunteers.assignAsTeammate}
                        className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50">
                        <MdCheck className="text-sm" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
