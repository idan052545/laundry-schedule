"use client";

import {
  MdAccessTime, MdPeople, MdThumbUp, MdSwapHoriz, MdStar,
  MdCheck, MdEdit, MdDelete, MdNotifications,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "./constants";
import type { VolRequest } from "./types";

interface RequestCardProps {
  req: VolRequest;
  myUserId?: string;
  isCommander: boolean;
  isSagal: boolean;
  submitting: boolean;
  fmtTime: (iso: string) => string;
  fmtDate: (iso: string) => string;
  onAssign: (requestId: string, userId?: string, type?: string) => void;
  onOpenCandidates: (req: VolRequest) => void;
  onShowReplace: (assignmentId: string | null) => void;
  onAcceptReplace: (replacementId: string) => void;
  onStartEdit: (req: VolRequest) => void;
  onNotify: (req: VolRequest) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onShowFeedback: (id: string) => void;
  onShowDispute: (id: string) => void;
}

export default function RequestCard({
  req, myUserId, isCommander, isSagal, submitting,
  fmtTime, fmtDate,
  onAssign, onOpenCandidates, onShowReplace, onAcceptReplace,
  onStartEdit, onNotify, onStatusChange, onShowFeedback, onShowDispute,
}: RequestCardProps) {
  const { t } = useLanguage();
  const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.other;
  const CatIcon = catConfig.icon;
  const activeAssignments = req.assignments.filter(a => a.status !== "cancelled" && a.status !== "replaced");
  const isMine = activeAssignments.some(a => a.userId === myUserId);
  const hasUrgentReplace = req.replacements.some(r => r.isUrgent);
  const slotsLeft = req.requiredCount - activeAssignments.length;

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition ${
        hasUrgentReplace ? "border-red-300 bg-red-50/30 animate-pulse" :
        req.isCommanderRequest ? "border-amber-300 bg-amber-50/20" :
        req.priority === "urgent" ? "border-red-200 bg-red-50/20" :
        !req.isCommanderRequest ? "border-green-200 bg-green-50/10" :
        "border-gray-200 bg-white"
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${catConfig.bg} ${catConfig.border} border flex items-center justify-center shrink-0`}>
            <CatIcon className={`text-xl ${catConfig.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-800">{req.title}</h3>
              {req.isCommanderRequest && <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-[9px] font-bold">{t.volunteers.commander}</span>}
              {!req.isCommanderRequest && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">{t.volunteers.helpRequestBadge}</span>}
              {req.priority === "urgent" && <span className="px-1.5 py-0.5 bg-red-200 text-red-800 rounded text-[9px] font-bold">{t.volunteers.urgentBadge}</span>}
              {req.allowPartial && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">{t.volunteers.partialOk}</span>}
              {hasUrgentReplace && <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[9px] font-bold animate-bounce">{t.volunteers.needsReplacer}</span>}
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_CONFIG[req.status]?.bg} ${STATUS_CONFIG[req.status]?.color}`}>
                {STATUS_CONFIG[req.status]?.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-0.5"><MdAccessTime className="text-xs" /> {fmtTime(req.startTime)}–{fmtTime(req.endTime)}</span>
              <span>{fmtDate(req.startTime)}</span>
              <span className="flex items-center gap-0.5"><MdPeople className="text-xs" /> {activeAssignments.length}/{req.requiredCount}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Avatar name={req.createdBy.name} image={req.createdBy.image} size="xs" />
              <span className="text-[10px] text-gray-400">{req.createdBy.name}</span>
              {req.target !== "all" && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-bold">
                  {req.target === "mixed" ? t.teams.mixed : req.target.replace("team-", `${t.common.team} `)}
                </span>
              )}
            </div>
          </div>
        </div>

        {activeAssignments.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {activeAssignments.map(a => (
              <div key={a.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border ${
                a.assignmentType === "commander" ? "bg-amber-50 border-amber-200 text-amber-800" :
                a.assignmentType === "team-member" ? "bg-cyan-50 border-cyan-200 text-cyan-800" :
                "bg-green-50 border-green-200 text-green-800"
              }`}>
                <Avatar name={a.user.name} image={a.user.image} size="xs" />
                <span>{a.user.name}</span>
                {a.assignmentType === "commander" && <span className="text-[8px]">({t.volunteers.commander})</span>}
                {a.assignmentType === "team-member" && <span className="text-[8px]">({t.common.team})</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {!isSagal && req.status === "open" && !isMine && slotsLeft > 0 && (
            <button onClick={() => onAssign(req.id)} disabled={submitting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition disabled:opacity-50">
              <MdThumbUp className="text-sm" /> {t.volunteers.iVolunteer}
            </button>
          )}
          {!isSagal && (req.status === "open" || req.status === "filled") && (isCommander || req.createdById === myUserId) && (
            <button onClick={() => onOpenCandidates(req)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
              <MdPeople className="text-sm" /> {t.volunteers.assign}
            </button>
          )}
          {!isSagal && isMine && req.status !== "completed" && req.status !== "cancelled" && (
            <button onClick={() => onShowReplace(req.assignments.find(a => a.userId === myUserId && a.status !== "cancelled")?.id || null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition">
              <MdSwapHoriz className="text-sm" /> {t.volunteers.needsReplace}
            </button>
          )}
          {!isSagal && req.replacements.filter(r => r.status === "seeking").map(r => (
            r.originalUserId !== myUserId && (
              <button key={r.id} onClick={() => onAcceptReplace(r.id)} disabled={submitting}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition disabled:opacity-50 ${
                  r.isUrgent ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-orange-600 hover:bg-orange-700"
                }`}>
                <MdSwapHoriz className="text-sm" /> {r.isUrgent ? t.volunteers.urgentReplace : t.volunteers.normalReplace}
              </button>
            )
          ))}
          {!isSagal && req.status === "open" && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onStartEdit(req)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-[10px] font-medium hover:bg-blue-50 transition">
              <MdEdit className="text-xs" /> {t.volunteers.editBtn}
            </button>
          )}
          {!isSagal && req.status === "open" && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onNotify(req)} disabled={submitting}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-200 text-green-600 text-[10px] font-medium hover:bg-green-50 transition disabled:opacity-50">
              <MdNotifications className="text-xs" /> {t.volunteers.alertBtn}
            </button>
          )}
          {!isSagal && req.status === "open" && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onStatusChange(req.id, "cancelled")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[10px] font-medium hover:bg-gray-50 transition">
              <MdDelete className="text-xs" /> {t.volunteers.cancelBtn}
            </button>
          )}
          {!isSagal && (req.status === "filled" || req.status === "in-progress") && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onStatusChange(req.id, "completed")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 text-white text-xs font-bold hover:bg-gray-800 transition">
              <MdCheck className="text-sm" /> {t.volunteers.completeBtn}
            </button>
          )}
          {req.status === "completed" && isMine && req._count.feedback === 0 && (
            <button onClick={() => onShowFeedback(req.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition">
              <MdStar className="text-sm" /> {t.volunteers.rateBtn}
            </button>
          )}
          {req.status === "completed" && isMine && (
            <button onClick={() => onShowDispute(req.id)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-[10px] font-medium hover:bg-amber-50 transition">
              <MdEdit className="text-xs" /> {t.volunteers.disputeBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
