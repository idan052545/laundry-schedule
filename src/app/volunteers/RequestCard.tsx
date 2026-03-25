"use client";

import {
  MdAccessTime, MdPeople, MdThumbUp, MdSwapHoriz, MdStar, MdStarBorder,
  MdCheck, MdEdit, MdDelete, MdNotifications, MdLocationOn, MdNotificationsActive,
  MdExpandMore, MdExpandLess, MdLightbulb, MdChat,
} from "react-icons/md";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";
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
  onRemindAssigned: (req: VolRequest) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onDelete: (id: string) => void;
  onShowFeedback: (id: string) => void;
  onShowDispute: (id: string) => void;
  getTranslation?: (text: string) => string;
}

export default function RequestCard({
  req, myUserId, isCommander, isSagal, submitting,
  fmtTime, fmtDate,
  onAssign, onOpenCandidates, onShowReplace, onAcceptReplace,
  onStartEdit, onNotify, onRemindAssigned, onStatusChange, onDelete, onShowFeedback, onShowDispute,
  getTranslation,
}: RequestCardProps) {
  const { t, locale } = useLanguage();
  const [showFeedbackDetails, setShowFeedbackDetails] = useState(false);
  const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.other;
  const CatIcon = catConfig.icon;
  const activeAssignments = req.assignments.filter(a => a.status !== "cancelled" && a.status !== "replaced");
  const isMine = activeAssignments.some(a => a.userId === myUserId);
  const hasUrgentReplace = req.replacements.some(r => r.isUrgent);
  const feedbackTypeIcons: Record<string, typeof MdThumbUp> = { preserve: MdThumbUp, improvement: MdLightbulb, vent: MdChat };
  const feedbackTypeLabels: Record<string, string> = { preserve: t.volunteers.feedbackPreserve, improvement: t.volunteers.feedbackImprovement, vent: t.volunteers.feedbackVent };
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
              <h3 className="text-sm font-bold text-gray-800">{getTranslation ? getTranslation(req.title) : req.title}</h3>
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
              <span className="text-[10px] text-gray-400">{displayName(req.createdBy, locale)}</span>
              {req.target !== "all" && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-bold">
                  {req.target === "mixed" ? t.teams.mixed : req.target.replace("team-", `${t.common.team} `)}
                </span>
              )}
              {req.location && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium flex items-center gap-0.5">
                  <MdLocationOn className="text-[10px]" /> {req.location}
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
                <span>{displayName(a.user, locale)}</span>
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
          {!isSagal && req.status !== "completed" && req.status !== "cancelled" && req.replacements.filter(r => r.status === "seeking").map(r => (
            <span key={r.id} className="contents">
              {r.originalUserId !== myUserId && (
                <button onClick={() => onAcceptReplace(r.id)} disabled={submitting}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition disabled:opacity-50 ${
                    r.isUrgent ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-orange-600 hover:bg-orange-700"
                  }`}>
                  <MdSwapHoriz className="text-sm" /> {r.isUrgent ? t.volunteers.urgentReplace : t.volunteers.normalReplace}
                </button>
              )}
              {(req.createdById === myUserId || isCommander) && (
                <button onClick={() => onOpenCandidates(req)} disabled={submitting}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-orange-200 text-orange-600 text-[10px] font-medium hover:bg-orange-50 transition disabled:opacity-50">
                  <MdPeople className="text-sm" /> {t.volunteers.pickReplacer}
                </button>
              )}
            </span>
          ))}
          {!isSagal && req.status === "open" && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onStartEdit(req)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-[10px] font-medium hover:bg-blue-50 transition">
              <MdEdit className="text-xs" /> {t.volunteers.editBtn}
            </button>
          )}
          {!isSagal && req.status !== "completed" && req.status !== "cancelled" && (req.createdById === myUserId || isCommander || isMine) && (
            activeAssignments.length > 0 ? (
              <button onClick={() => onRemindAssigned(req)} disabled={submitting}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-purple-200 text-purple-600 text-[10px] font-medium hover:bg-purple-50 transition disabled:opacity-50">
                <MdNotificationsActive className="text-xs" /> {t.volunteers.remindBtn}
              </button>
            ) : req.status === "open" && (req.createdById === myUserId || isCommander) ? (
              <button onClick={() => onNotify(req)} disabled={submitting}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-200 text-green-600 text-[10px] font-medium hover:bg-green-50 transition disabled:opacity-50">
                <MdNotifications className="text-xs" /> {t.volunteers.alertBtn}
              </button>
            ) : null
          )}
          {!isSagal && req.status === "open" && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onStatusChange(req.id, "cancelled")} disabled={submitting}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[10px] font-medium hover:bg-gray-50 transition disabled:opacity-50">
              <MdDelete className="text-xs" /> {t.volunteers.cancelBtn}
            </button>
          )}
          {!isSagal && (req.status === "filled" || req.status === "in-progress") && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onStatusChange(req.id, "completed")} disabled={submitting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 text-white text-xs font-bold hover:bg-gray-800 transition disabled:opacity-50">
              <MdCheck className="text-sm" /> {t.volunteers.completeBtn}
            </button>
          )}
          {!isSagal && (req.status === "cancelled" || req.status === "completed") && (req.createdById === myUserId || isCommander) && (
            <button onClick={() => onDelete(req.id)} disabled={submitting}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition disabled:opacity-50">
              <MdDelete className="text-xs" /> {t.volunteers.deleteBtn}
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

        {/* Feedback summary for completed requests */}
        {req.status === "completed" && req.feedback && req.feedback.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <button onClick={() => setShowFeedbackDetails(!showFeedbackDetails)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-purple-600 hover:text-purple-700 w-full">
              <MdStar className="text-xs" />
              <span className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(n => {
                  const avg = req.feedback.reduce((s, f) => s + f.rating, 0) / req.feedback.length;
                  return n <= Math.round(avg)
                    ? <MdStar key={n} className="text-amber-400 text-[10px]" />
                    : <MdStarBorder key={n} className="text-gray-300 text-[10px]" />;
                })}
              </span>
              <span className="text-gray-400">({req.feedback.length})</span>
              {/* Type summary */}
              {Object.entries(req.feedback.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([type, count]) => {
                const Icon = feedbackTypeIcons[type] || MdStar;
                return <span key={type} className="flex items-center gap-0.5 text-[10px] text-gray-400"><Icon className="text-[10px]" />{count}</span>;
              })}
              <span className="ms-auto">{showFeedbackDetails ? <MdExpandLess /> : <MdExpandMore />}</span>
            </button>

            {showFeedbackDetails && (
              <div className="mt-2 space-y-1.5">
                {req.feedback.map(f => {
                  const Icon = feedbackTypeIcons[f.type] || MdStar;
                  return (
                    <div key={f.id} className="flex items-start gap-2 bg-purple-50/50 rounded-lg px-2.5 py-2 border border-purple-100">
                      <Avatar name={f.user.name} image={f.user.image || null} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-700">{displayName(f.user, locale)}</span>
                          <span className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              n <= f.rating
                                ? <MdStar key={n} className="text-amber-400 text-[9px]" />
                                : <MdStarBorder key={n} className="text-gray-300 text-[9px]" />
                            ))}
                          </span>
                          <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                            f.type === "preserve" ? "bg-green-100 text-green-700" :
                            f.type === "improvement" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            <Icon className="inline text-[9px]" /> {feedbackTypeLabels[f.type] || f.type}
                          </span>
                        </div>
                        {f.comment && <p className="text-[10px] text-gray-500 mt-0.5">{f.comment}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
