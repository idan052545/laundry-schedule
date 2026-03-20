"use client";

import { MdSwapHoriz, MdStar, MdEdit } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "./constants";
import type { VolRequest } from "./types";

interface MyAssignmentCardProps {
  req: VolRequest;
  myUserId?: string;
  fmtTime: (iso: string) => string;
  fmtDate: (iso: string) => string;
  onShowReplace: (assignmentId: string) => void;
  onShowFeedback: (id: string) => void;
  onShowDispute: (id: string) => void;
}

export default function MyAssignmentCard({
  req, myUserId, fmtTime, fmtDate,
  onShowReplace, onShowFeedback, onShowDispute,
}: MyAssignmentCardProps) {
  const { t } = useLanguage();
  const myAssignment = req.assignments.find(a => a.userId === myUserId && a.status !== "cancelled");
  if (!myAssignment) return null;

  const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.other;
  const CatIcon = catConfig.icon;

  return (
    <div className="bg-white rounded-2xl border-2 border-green-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${catConfig.bg} flex items-center justify-center`}>
          <CatIcon className={`text-xl ${catConfig.color}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800">{req.title}</h3>
          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
            <span>{fmtDate(req.startTime)} {fmtTime(req.startTime)}–{fmtTime(req.endTime)}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_CONFIG[req.status]?.bg} ${STATUS_CONFIG[req.status]?.color}`}>
              {STATUS_CONFIG[req.status]?.label}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {myAssignment.assignmentType === "self" ? t.volunteers.iVolunteered : myAssignment.assignmentType === "commander" ? t.volunteers.assignedByCommander : t.volunteers.assignedByTeammate}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        {req.status !== "completed" && req.status !== "cancelled" && (
          <button onClick={() => onShowReplace(myAssignment.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition">
            <MdSwapHoriz className="text-sm" /> {t.volunteers.needsReplace}
          </button>
        )}
        {req.status === "completed" && (
          <>
            <button onClick={() => onShowFeedback(req.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition">
              <MdStar className="text-sm" /> {t.volunteers.rateBtn}
            </button>
            <button onClick={() => onShowDispute(req.id)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-[10px] font-medium hover:bg-amber-50 transition">
              <MdEdit className="text-xs" /> {t.volunteers.disputeBtn}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
