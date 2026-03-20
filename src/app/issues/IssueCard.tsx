"use client";

import { MdLocationOn, MdComment, MdImage } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";
import { Issue, STATUS_CONFIG, getStatusConfig, formatDate } from "./types";

interface IssueCardProps {
  issue: Issue;
  isAdmin: boolean;
  onSelect: () => void;
  onStatusChange: (issueId: string, status: string) => void;
}

export default function IssueCard({ issue, isAdmin, onSelect, onStatusChange }: IssueCardProps) {
  const { t, dateLocale } = useLanguage();
  const statusConfig = getStatusConfig(t);
  const sc = statusConfig[issue.status] || statusConfig.new;

  return (
    <button onClick={onSelect}
      className="w-full text-start bg-white p-4 rounded-xl shadow-sm border-2 border-gray-100 hover:border-dotan-mint hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
          issue.status === "urgent" ? "bg-red-500 animate-pulse" :
          issue.status === "new" ? "bg-blue-500" :
          issue.status === "open" ? "bg-amber-500" : "bg-green-500"
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-800 text-sm truncate">{issue.title}</h3>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${sc.bg} ${sc.border} ${sc.color}`}>
              {sc.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            {issue.location && (
              <span className="flex items-center gap-0.5"><MdLocationOn className="text-red-300" /> {issue.location}</span>
            )}
            <span>{issue.createdBy.name}</span>
            <span>{formatDate(issue.createdAt, dateLocale)}</span>
            {issue.comments.length > 0 && (
              <span className="flex items-center gap-0.5"><MdComment /> {issue.comments.length}</span>
            )}
            {issue.imageUrl && <MdImage className="text-purple-300" />}
          </div>

          {issue.assignees.length > 0 && (
            <div className="flex -space-x-1 mt-2 rtl:space-x-reverse">
              {issue.assignees.slice(0, 4).map((a) => (
                <div key={a.id} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                  <Avatar name={a.user.name} image={a.user.image} size="xs" />
                </div>
              ))}
              {issue.assignees.length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                  +{issue.assignees.length - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {isAdmin && issue.status !== "closed" && (
          <div className="shrink-0 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            {issue.status !== "urgent" && (
              <button onClick={() => onStatusChange(issue.id, "urgent")}
                className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition">
                {t.issues.urgentBadge}
              </button>
            )}
            <button onClick={() => onStatusChange(issue.id, "closed")}
              className="text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition">
              {t.issues.closeBtn}
            </button>
          </div>
        )}
      </div>
    </button>
  );
}
