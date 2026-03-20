"use client";

import {
  MdDelete,
  MdAdd,
  MdClose,
  MdNotifications,
  MdCheckCircle,
  MdLock,
  MdLockOpen,
  MdPerson,
  MdThumbUp,
  MdThumbDown,
  MdRadioButtonChecked,
  MdEdit,
  MdDownload,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import SimMultiSelect from "./SimMultiSelect";
import { Survey, SurveyUser } from "./types";

interface SurveyDetailViewProps {
  survey: Survey;
  userId: string;
  teamMembers: SurveyUser[];
  detailTeamFilter: number | null;
  setDetailTeamFilter: (v: number | null) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDesc: string;
  setEditDesc: (v: string) => void;
  editOptions: string[];
  setEditOptions: (v: string[]) => void;
  sending: boolean;
  reminding: boolean;
  onBack: () => void;
  onRespond: (surveyId: string, answer: unknown) => void;
  onAction: (surveyId: string, action: string) => void;
  onRemind: (surveyId: string) => void;
  onExport: (survey: Survey) => void;
  onDelete: (surveyId: string) => void;
  onStartEdit: (survey: Survey) => void;
  onSaveEdit: () => void;
  formatDate: (d: string) => string;
}

export default function SurveyDetailView({
  survey, userId, teamMembers, detailTeamFilter, setDetailTeamFilter,
  editing, setEditing, editTitle, setEditTitle, editDesc, setEditDesc,
  editOptions, setEditOptions, sending, reminding,
  onBack, onRespond, onAction, onRemind, onExport, onDelete, onStartEdit, onSaveEdit, formatDate,
}: SurveyDetailViewProps) {
  const options: string[] = survey.options ? JSON.parse(survey.options) : [];
  const myResponse = survey.responses.find((r) => r.user.id === userId);
  const myAnswer = myResponse ? JSON.parse(myResponse.answer) : null;
  const isCreator = survey.createdById === userId;
  const respondedIds = new Set(survey.responses.map((r) => r.user.id));

  // Calculate results
  const resultMap = new Map<string, number>();
  if (survey.type === "yes_no") { resultMap.set("yes", 0); resultMap.set("no", 0); }
  else options.forEach((_, i) => resultMap.set(String(i), 0));
  survey.responses.forEach((r) => {
    const ans = JSON.parse(r.answer);
    if (survey.type === "multi") (ans as number[]).forEach((i: number) => resultMap.set(String(i), (resultMap.get(String(i)) || 0) + 1));
    else resultMap.set(String(ans), (resultMap.get(String(ans)) || 0) + 1);
  });
  const totalResponses = survey.responses.length;

  // Filtered members for detail team filter
  const filteredResponses = detailTeamFilter
    ? survey.responses.filter((r) => r.user.team === detailTeamFilter)
    : survey.responses;
  const filteredMembers = detailTeamFilter
    ? teamMembers.filter((m) => m.team === detailTeamFilter)
    : teamMembers;
  const filteredNotResponded = filteredMembers.filter((m) => !respondedIds.has(m.id));

  // Available teams
  const teams = [...new Set(teamMembers.map((m) => m.team).filter((t): t is number => t !== null && t !== undefined))].sort();

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← חזרה לסקרים
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        {/* Header */}
        {editing ? (
          <div className="space-y-3 border-b pb-4">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-400 outline-none" placeholder="כותרת" />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none min-h-[50px]" placeholder="תיאור (אופציונלי)" />
            {survey.type !== "yes_no" && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-medium">אפשרויות:</label>
                {editOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={opt} onChange={(e) => { const o = [...editOptions]; o[i] = e.target.value; setEditOptions(o); }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none" placeholder={`אפשרות ${i + 1}`} />
                    {editOptions.length > 2 && <button type="button" onClick={() => setEditOptions(editOptions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2"><MdClose /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setEditOptions([...editOptions, ""])} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><MdAdd /> הוסף אפשרות</button>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
              <button onClick={onSaveEdit} disabled={sending} className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50">{sending ? "שומר..." : "שמור"}</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800">{survey.title}</h3>
                {isCreator && <button onClick={() => onStartEdit(survey)} className="text-gray-400 hover:text-gray-600"><MdEdit className="text-lg" /></button>}
              </div>
              {survey.description && <p className="text-sm text-gray-500 mt-1">{survey.description}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{survey.createdBy.name}</span>
                <span>•</span>
                <span>{formatDate(survey.createdAt)}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${survey.team === 0 ? "bg-purple-50 text-purple-600 border border-purple-200" : "bg-blue-50 text-blue-600 border border-blue-200"}`}>
                  {survey.team === 0 ? "כל הפלוגה" : `צוות ${survey.team}`}
                </span>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              survey.status === "active" ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}>
              {survey.status === "active" ? "פעיל" : "סגור"}
            </span>
          </div>
        )}

        {/* Voting section */}
        {survey.status === "active" && (
          <div className="border rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">{myAnswer !== null ? "שנה תשובה:" : "הצבע:"}</h3>
            {survey.type === "yes_no" && (
              <div className="flex gap-3">
                <button onClick={() => onRespond(survey.id, "yes")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${myAnswer === "yes" ? "bg-green-500 text-white" : "bg-green-50 text-green-600 border-2 border-green-200 hover:border-green-400"}`}>
                  <MdThumbUp /> כן
                </button>
                <button onClick={() => onRespond(survey.id, "no")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${myAnswer === "no" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-400"}`}>
                  <MdThumbDown /> לא
                </button>
              </div>
            )}
            {survey.type === "single" && (
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <button key={i} onClick={() => onRespond(survey.id, i)}
                    className={`w-full text-right p-3 rounded-lg text-sm transition flex items-center gap-2 ${myAnswer === i ? "bg-purple-600 text-white" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"}`}>
                    <MdRadioButtonChecked className={myAnswer === i ? "text-white" : "text-gray-300"} /> {opt}
                  </button>
                ))}
              </div>
            )}
            {survey.type === "multi" && (
              <SimMultiSelect options={options} selected={myAnswer || []} onSubmit={(sel) => onRespond(survey.id, sel)} />
            )}
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 text-sm">תוצאות ({totalResponses}/{teamMembers.length})</h3>
          {survey.type === "yes_no" && (
            <div className="space-y-2">
              {[{ key: "yes", label: "כן", color: "bg-green-500" }, { key: "no", label: "לא", color: "bg-red-500" }].map(({ key, label, color }) => {
                const count = resultMap.get(key) || 0;
                const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-8">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all flex items-center justify-end px-2`} style={{ width: `${Math.max(pct, 5)}%` }}>
                        <span className="text-xs text-white font-bold">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-left">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
          {(survey.type === "single" || survey.type === "multi") && (
            <div className="space-y-2">
              {options.map((opt, i) => {
                const count = resultMap.get(String(i)) || 0;
                const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 flex-shrink-0 max-w-[120px] truncate">{opt}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all flex items-center justify-end px-2" style={{ width: `${Math.max(pct, 5)}%` }}>
                        <span className="text-xs text-white font-bold">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-left">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team filter for responses */}
        {teams.length > 1 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-gray-500 font-medium">סנן לפי צוות:</span>
            <button onClick={() => setDetailTeamFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${!detailTeamFilter ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              הכל
            </button>
            {teams.map((t) => (
              <button key={t} onClick={() => setDetailTeamFilter(detailTeamFilter === t ? null : t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${detailTeamFilter === t ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                צוות {t}
              </button>
            ))}
          </div>
        )}

        {/* Who responded / didn't */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h4 className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1"><MdCheckCircle /> ענו ({filteredResponses.length})</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredResponses.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 text-xs">
                  <Avatar name={r.user.name} image={r.user.image} size="xs" />
                  <span className="truncate">{r.user.name}</span>
                  {r.user.team && !detailTeamFilter && <span className="text-[10px] text-gray-400">({r.user.team})</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1"><MdPerson /> לא ענו ({filteredNotResponded.length})</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredNotResponded.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Avatar name={m.name} image={m.image} size="xs" />
                  <span className="truncate">{m.name}</span>
                  {m.team && !detailTeamFilter && <span className="text-[10px]">({m.team})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creator actions */}
        {isCreator && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {survey.status === "active" ? (
              <button onClick={() => onAction(survey.id, "close")} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1"><MdLock /> סגור סקר</button>
            ) : (
              <button onClick={() => onAction(survey.id, "reopen")} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1"><MdLockOpen /> פתח מחדש</button>
            )}
            <button onClick={() => onRemind(survey.id)} disabled={reminding}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center gap-1 disabled:opacity-50">
              <MdNotifications /> {reminding ? "שולח..." : `תזכר (${filteredNotResponded.length})`}
            </button>
            <button onClick={() => onExport(survey)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1"><MdDownload /> ייצוא</button>
            <button onClick={() => onDelete(survey.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1"><MdDelete /> מחק</button>
          </div>
        )}
      </div>
    </div>
  );
}
