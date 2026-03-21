"use client";

import { MdClose, MdCheck, MdStar, MdSearch, MdFilterList } from "react-icons/md";
import { useState } from "react";
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

type CandidateFilter = "all" | "free" | "assigned" | "conflicts";

export default function CandidatesModal({
  selectedRequest, candidates, loadingCandidates, submitting,
  onClose, onAssign,
}: CandidatesModalProps) {
  const { t, locale } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CandidateFilter>("all");
  const [teamFilter, setTeamFilter] = useState<number | null>(null);

  const teams = [...new Set(candidates.map(c => c.team).filter((t): t is number => t != null))].sort();

  const filtered = candidates.filter(c => {
    // Search by name
    if (search) {
      const q = search.toLowerCase();
      const name = (c.name || "").toLowerCase();
      const nameEn = ((c as unknown as { nameEn?: string }).nameEn || "").toLowerCase();
      if (!name.includes(q) && !nameEn.includes(q)) return false;
    }
    // Team filter
    if (teamFilter !== null && c.team !== teamFilter) return false;
    // Status filter
    if (filter === "free") return c.isFree && !c.isAssigned && !c.teamFull;
    if (filter === "assigned") return c.isAssigned;
    if (filter === "conflicts") return c.conflicts.length > 0 && !c.isAssigned;
    return true;
  });

  const freeCount = candidates.filter(c => c.isFree && !c.isAssigned && !c.teamFull).length;
  const assignedCount = candidates.filter(c => c.isAssigned).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">{t.volunteers.candidatesTitle} {selectedRequest.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose className="text-lg" /></button>
        </div>

        {/* Search + filters */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-gray-100">
          <div className="relative">
            <MdSearch className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.common.search}
              className="w-full ps-8 pe-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-300 transition" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <MdFilterList className="text-xs text-gray-400" />
            {([
              { key: "all" as CandidateFilter, label: t.common.all, count: candidates.length },
              { key: "free" as CandidateFilter, label: t.volunteers.available, count: freeCount },
              { key: "assigned" as CandidateFilter, label: t.volunteers.alreadyAssigned, count: assignedCount },
              { key: "conflicts" as CandidateFilter, label: t.volunteers.hasConflicts, count: candidates.filter(c => c.conflicts.length > 0 && !c.isAssigned).length },
            ]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                  filter === f.key ? "bg-green-600 text-white border-green-600" : "bg-gray-50 border-gray-200 text-gray-500"
                }`}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          {teams.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => setTeamFilter(null)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                  teamFilter === null ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 border-gray-200 text-gray-500"
                }`}>
                {t.common.all}
              </button>
              {teams.map(tm => (
                <button key={tm} onClick={() => setTeamFilter(tm === teamFilter ? null : tm)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                    teamFilter === tm ? `${TEAM_COLORS[tm] || TEAM_COLORS[0]}` : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}>
                  {tm}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingCandidates ? <InlineLoading /> : (
            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">{t.volunteers.noCandidates}</p>
              )}
              {filtered.map(c => (
                <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                  c.isAssigned ? "bg-green-50 border-green-300" : c.teamFull ? "bg-gray-100 border-gray-200 opacity-50" : c.isFree ? "bg-white border-gray-200 hover:border-green-300" : "bg-gray-50 border-gray-200"
                }`}>
                  <Avatar name={c.name} image={c.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{displayName(c, locale)}</span>
                      {c.team && <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${TEAM_COLORS[c.team] || TEAM_COLORS[0]}`}>{c.team}</span>}
                      {c.isAssigned && <span className="text-[8px] font-bold px-1 py-0.5 bg-green-200 text-green-800 rounded">{t.volunteers.alreadyAssigned}</span>}
                      {c.teamFull && !c.isAssigned && <span className="text-[8px] font-bold px-1 py-0.5 bg-gray-200 text-gray-600 rounded">{t.volunteers.teamFull || "צוות מלא"}</span>}
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
                    {c.isFree && !c.isAssigned && !c.teamFull && <span className="text-[10px] text-green-600 font-medium">{t.volunteers.available}</span>}
                  </div>
                  {!c.isAssigned && !c.teamFull && (
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
