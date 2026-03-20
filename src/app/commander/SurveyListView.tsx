"use client";

import {
  MdAdd,
  MdClose,
  MdSend,
  MdPoll,
  MdCheckCircle,
} from "react-icons/md";
import { Survey, SurveyUser, SURVEY_TYPE_CONFIG } from "./types";

interface SurveyListViewProps {
  surveys: Survey[];
  teamMembers: SurveyUser[];
  userId: string;
  isCommander: boolean;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formDesc: string;
  setFormDesc: (v: string) => void;
  formType: string;
  setFormType: (v: string) => void;
  formOptions: string[];
  setFormOptions: (v: string[]) => void;
  sending: boolean;
  onSelectSurvey: (survey: Survey) => void;
  onCreateSubmit: (e: React.FormEvent) => void;
  formatDate: (d: string) => string;
}

export default function SurveyListView({
  surveys, teamMembers, userId, isCommander,
  showForm, setShowForm, formTitle, setFormTitle, formDesc, setFormDesc,
  formType, setFormType, formOptions, setFormOptions, sending,
  onSelectSurvey, onCreateSubmit, formatDate,
}: SurveyListViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
          <MdPoll /> סקרים
        </h2>
        {isCommander && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-1 text-sm">
            {showForm ? <><MdClose /> סגור</> : <><MdAdd /> סקר חדש</>}
          </button>
        )}
      </div>

      {/* Create form — always platoon */}
      {showForm && (
        <form onSubmit={onCreateSubmit} className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
          <div className="text-xs text-purple-600 font-medium flex items-center gap-1 bg-purple-100 px-2.5 py-1.5 rounded-lg">
            <MdPoll /> סקר לכל הפלוגה — כל החיילים יראו ויקבלו התראה
          </div>
          <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white" placeholder="שאלה / כותרת *" required />
          <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
            className="w-full px-3 py-2.5 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none min-h-[60px] bg-white" placeholder="תיאור (אופציונלי)" />
          <div className="flex gap-2">
            {Object.entries(SURVEY_TYPE_CONFIG).map(([key, { label, icon: Icon }]) => (
              <button key={key} type="button" onClick={() => setFormType(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  formType === key ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}>
                <Icon /> {label}
              </button>
            ))}
          </div>
          {formType !== "yes_no" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">אפשרויות:</label>
              {formOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={opt} onChange={(e) => { const o = [...formOptions]; o[i] = e.target.value; setFormOptions(o); }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white" placeholder={`אפשרות ${i + 1}`} />
                  {formOptions.length > 2 && <button type="button" onClick={() => setFormOptions(formOptions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2"><MdClose /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setFormOptions([...formOptions, ""])} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><MdAdd /> הוסף אפשרות</button>
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={sending}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
              <MdSend /> {sending ? "יוצר..." : "צור סקר"}
            </button>
          </div>
        </form>
      )}

      {/* Survey list */}
      <div className="space-y-2">
        {surveys.map((survey) => {
          const myResponse = survey.responses.find((r) => r.user.id === userId);
          const cfg = SURVEY_TYPE_CONFIG[survey.type] || SURVEY_TYPE_CONFIG.yes_no;
          return (
            <button key={survey.id} onClick={() => onSelectSurvey(survey)}
              className="w-full text-right bg-white p-3 rounded-xl shadow-sm border-2 border-gray-100 hover:border-purple-200 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  survey.status === "active" ? "bg-purple-50 text-purple-500" : "bg-gray-100 text-gray-400"
                }`}>
                  <cfg.icon className="text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{survey.title}</h3>
                    {survey.status === "closed" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 shrink-0">סגור</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{survey.createdBy.name}</span>
                    <span>•</span>
                    <span>{formatDate(survey.createdAt)}</span>
                    <span>•</span>
                    <span>{survey.responses.length}/{teamMembers.length} ענו</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {myResponse ? <MdCheckCircle className="text-green-500 text-lg" /> :
                    survey.status === "active" ? <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">ממתין</span> : null}
                </div>
              </div>
              <div className="mt-1.5 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(survey.responses.length / Math.max(teamMembers.length, 1)) * 100}%` }} />
              </div>
            </button>
          );
        })}
        {surveys.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <MdPoll className="text-4xl mx-auto mb-2 text-gray-300" />
            <p className="text-sm">אין סקרים עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}
