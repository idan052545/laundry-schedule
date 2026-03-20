"use client";

import {
  MdLocationOn, MdPhone, MdPerson, MdComment,
  MdSend, MdDelete, MdAssignmentInd, MdArrowBack,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { Issue, User, STATUS_CONFIG, formatDate } from "./types";
import AssignModal from "./AssignModal";

interface IssueDetailProps {
  issue: Issue;
  isAdmin: boolean;
  userId: string | null;
  commentText: string;
  setCommentText: (v: string) => void;
  sendingComment: boolean;
  onComment: () => void;
  onStatusChange: (issueId: string, status: string) => void;
  onDelete: (issueId: string) => void;
  onBack: () => void;
  // Assign modal
  showAssign: boolean;
  setShowAssign: (v: boolean) => void;
  allUsers: User[];
  assignSearch: string;
  setAssignSearch: React.Dispatch<React.SetStateAction<string>>;
  assignSelected: string[];
  setAssignSelected: React.Dispatch<React.SetStateAction<string[]>>;
  onAssign: () => void;
}

export default function IssueDetail({
  issue, isAdmin, userId,
  commentText, setCommentText, sendingComment, onComment,
  onStatusChange, onDelete, onBack,
  showAssign, setShowAssign, allUsers,
  assignSearch, setAssignSearch, assignSelected, setAssignSelected, onAssign,
}: IssueDetailProps) {
  const sc = STATUS_CONFIG[issue.status] || STATUS_CONFIG.new;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <MdArrowBack /> חזרה לרשימה
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {issue.imageUrl && (
          <div className="w-full max-h-64 overflow-hidden">
            <img src={issue.imageUrl} alt="" className="w-full object-cover" />
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-800">{issue.title}</h1>
            <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-bold ${sc.bg} ${sc.border} ${sc.color}`}>
              <sc.icon className="inline text-sm ml-1" />
              {sc.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {issue.location && (
              <span className="flex items-center gap-1"><MdLocationOn className="text-red-400" /> {issue.location}</span>
            )}
            <span className="flex items-center gap-1"><MdPerson className="text-gray-400" /> {issue.createdBy.name}</span>
            <span>{formatDate(issue.createdAt)}</span>
          </div>

          {issue.description && (
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{issue.description}</p>
          )}

          {issue.companion && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <span className="font-medium text-amber-700">מלווה: </span>
              <span className="text-amber-800">{issue.companion}</span>
              {issue.companionPhone && (
                <a href={`tel:${issue.companionPhone}`} className="flex items-center gap-1 text-amber-600 hover:underline mt-1">
                  <MdPhone /> {issue.companionPhone}
                </a>
              )}
            </div>
          )}

          {/* Assignees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">משובצים</h3>
              {isAdmin && (
                <button onClick={() => { setAssignSelected(issue.assignees.map((a) => a.user.id)); setShowAssign(true); setAssignSearch(""); }}
                  className="text-xs text-dotan-green hover:underline flex items-center gap-1">
                  <MdAssignmentInd /> שבץ
                </button>
              )}
            </div>
            {issue.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {issue.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-sm">
                    <Avatar name={a.user.name} image={a.user.image} size="xs" />
                    <span>{a.user.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">לא שובצו עדיין</p>
            )}
          </div>

          {/* Status change (admin) */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => onStatusChange(issue.id, key)}
                  disabled={issue.status === key}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                    issue.status === key
                      ? `${cfg.bg} ${cfg.border} ${cfg.color} cursor-default`
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}>
                  <cfg.icon className="inline text-sm ml-1" />
                  {cfg.label}
                </button>
              ))}
            </div>
          )}

          {/* Delete */}
          {(isAdmin || issue.createdById === userId) && (
            <div className="flex gap-2 pt-2">
              <button onClick={() => onDelete(issue.id)}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <MdDelete /> מחק
              </button>
            </div>
          )}

          {/* Comments */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-1">
              <MdComment /> תגובות ({issue.comments.length})
            </h3>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {issue.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.user.name} image={c.user.image} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-700">{c.user.name}</span>
                      <span className="text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              {issue.comments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">אין תגובות</p>
              )}
            </div>

            <div className="flex gap-2">
              <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                placeholder="הוסף תגובה..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") onComment(); }}
              />
              <button onClick={onComment} disabled={sendingComment || !commentText.trim()}
                className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition disabled:opacity-50">
                <MdSend className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignModal
          allUsers={allUsers}
          assignSelected={assignSelected}
          setAssignSelected={setAssignSelected}
          assignSearch={assignSearch}
          setAssignSearch={setAssignSearch}
          onClose={() => setShowAssign(false)}
          onSave={onAssign}
        />
      )}
    </div>
  );
}
