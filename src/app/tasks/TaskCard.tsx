"use client";

import { useState } from "react";
import {
  MdCheck, MdDelete, MdEdit, MdSend, MdReplay,
  MdExpandMore, MdExpandLess, MdNotifications,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, getCategoryLabels, PRIORITY_CONFIG } from "./constants";
import { formatRelative, formatTime, formatDate, daysUntil } from "./utils";
import { Task } from "./types";
import { getMonthsArray } from "./constants";

interface TaskCardProps {
  task: Task;
  isExpanded: boolean;
  onToggle: () => void;
  myUserId: string | undefined;
  canEdit: boolean;
  onAction: (id: string, action: string, content?: string) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({
  task, isExpanded, onToggle, myUserId, canEdit,
  onAction, onEdit, onDelete,
}: TaskCardProps) {
  const { t, dateLocale } = useLanguage();
  const [responseText, setResponseText] = useState("");
  const [reminding, setReminding] = useState(false);

  const categoryLabels = getCategoryLabels(t);
  const months = getMonthsArray(t);
  const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.task;
  const Icon = config.icon;
  const isDone = task.status === "done";
  const isMine = task.userId === myUserId;
  const isOverdue = task.dueDate && daysUntil(task.dueDate) < 0 && !isDone;
  const dueDays = task.dueDate ? daysUntil(task.dueDate) : null;

  const handleRemind = async () => {
    setReminding(true);
    await onAction(task.id, "remind");
    setReminding(false);
  };

  const handleResponse = async () => {
    const text = responseText.trim();
    if (!text) return;
    await onAction(task.id, "respond", text);
    setResponseText("");
  };

  return (
    <div className={`bg-white rounded-xl border-2 transition overflow-hidden ${
      isDone ? "border-gray-200 opacity-70" :
      isOverdue ? "border-red-300 bg-red-50/30" :
      `${config.border}`
    }`}>
      {/* Task header */}
      <button onClick={onToggle} className="w-full text-start p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDone ? "bg-gray-300" : PRIORITY_CONFIG[task.priority].dot}`} />
          <Icon className={`text-lg shrink-0 ${isDone ? "text-gray-400" : config.color}`} />
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
              {task.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-gray-500">
                {formatRelative(task.startDate, t.common.today, t.common.tomorrow, months)}
                {!task.allDay && ` ${formatTime(task.startDate, dateLocale)}`}
              </span>
              {task.dueDate && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isDone ? "bg-green-100 text-green-600" :
                  isOverdue ? "bg-red-100 text-red-600" :
                  dueDays !== null && dueDays <= 3 ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {isDone ? t.tasks.completed :
                   isOverdue ? t.tasks.overdueDays.replace("{n}", String(Math.abs(dueDays!))) :
                   dueDays === 0 ? t.tasks.dueToday :
                   dueDays === 1 ? t.tasks.dueTomorrow :
                   t.tasks.dueOn.replace("{date}", formatDate(task.dueDate, months))}
                </span>
              )}
              {!isMine && task.user && (
                <span className="text-[10px] text-gray-400">
                  {task.userId ? task.user.name : t.tasks.general}
                </span>
              )}
              {task.responses.length > 0 && (
                <span className="text-[10px] text-blue-500 font-medium">{t.tasks.nComments.replace("{n}", String(task.responses.length))}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${config.bg} ${config.color} ${config.border}`}>
              {categoryLabels[task.category] || categoryLabels.task}
            </span>
            {isExpanded ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-400" />}
          </div>
        </div>
      </button>

      {/* Expanded section */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-3 sm:p-4 space-y-3">
          {task.description && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isDone ? (
              <button onClick={() => onAction(task.id, "done")}
                className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-1">
                <MdCheck className="text-sm" /> {t.tasks.completeTask}
              </button>
            ) : (
              <button onClick={() => onAction(task.id, "reopen")}
                className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition font-medium flex items-center gap-1">
                <MdReplay className="text-sm" /> {t.tasks.reopenTask}
              </button>
            )}
            <button onClick={handleRemind} disabled={reminding}
              className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition font-medium flex items-center gap-1 disabled:opacity-50">
              <MdNotifications className={`text-sm ${reminding ? "animate-bounce" : ""}`} /> {t.tasks.reminder}
            </button>
            {canEdit && (
              <>
                <button onClick={() => onEdit(task)}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-1">
                  <MdEdit className="text-sm" /> {t.common.edit}
                </button>
                <button onClick={() => onDelete(task.id)}
                  className="text-xs text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition font-medium flex items-center gap-1">
                  <MdDelete className="text-sm" />
                </button>
              </>
            )}
          </div>

          {/* Responses */}
          {task.responses.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500">{t.tasks.comments}</div>
              {task.responses.map(r => (
                <div key={r.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                  <Avatar name={r.user.name} image={r.user.image} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-700">{r.user.name}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString(dateLocale,{day:"numeric",month:"short"})}
                        {" "}
                        {new Date(r.createdAt).toLocaleTimeString(dateLocale,{hour:"2-digit",minute:"2-digit"})}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add response */}
          <div className="flex gap-2">
            <input type="text" placeholder={t.tasks.addComment}
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleResponse(); }}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-dotan-green" />
            <button onClick={handleResponse}
              disabled={!responseText.trim()}
              className="bg-dotan-green text-white px-3 rounded-lg hover:bg-dotan-green-dark transition disabled:opacity-30">
              <MdSend className="text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
