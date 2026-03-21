"use client";

import { useEffect } from "react";
import {
  MdAdd, MdClose, MdSend, MdDelete, MdDownload,
  MdNotifications, MdCheckCircle, MdLock, MdLockOpen, MdPerson,
  MdThumbUp, MdThumbDown, MdRadioButtonChecked, MdEdit,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import MultiSelect from "./MultiSelect";
import { Survey, User, formatDate } from "./types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";
import { useTranslation } from "@/components/TranslateButton";

interface SurveyDetailProps {
  survey: Survey;
  userId: string | null;
  isSagal: boolean;
  teamMembers: User[];
  reminding: boolean;
  sending: boolean;
  editing: boolean;
  editTitle: string;
  editDesc: string;
  editOptions: string[];
  setEditing: (v: boolean) => void;
  setEditTitle: (v: string) => void;
  setEditDesc: (v: string) => void;
  setEditOptions: (v: string[]) => void;
  onBack: () => void;
  onRespond: (surveyId: string, answer: unknown) => void;
  onClose: (surveyId: string) => void;
  onReopen: (surveyId: string) => void;
  onRemind: (surveyId: string) => void;
  onDelete: (surveyId: string) => void;
  onExport: (survey: Survey) => void;
  onStartEdit: (survey: Survey) => void;
  onSaveEdit: () => void;
}

export default function SurveyDetail({
  survey, userId, isSagal, teamMembers, reminding, sending,
  editing, editTitle, editDesc, editOptions, setEditing, setEditTitle, setEditDesc, setEditOptions,
  onBack, onRespond, onClose, onReopen, onRemind, onDelete, onExport, onStartEdit, onSaveEdit,
}: SurveyDetailProps) {
  const { t, locale, dateLocale } = useLanguage();
  const { translateTexts, getTranslation, isEnglish } = useTranslation();
  const options: string[] = survey.options ? JSON.parse(survey.options) : [];
  const myResponse = survey.responses.find((r) => r.user.id === userId);
  const myAnswer = myResponse ? JSON.parse(myResponse.answer) : null;
  const isCreator = survey.createdById === userId;
  const respondedIds = new Set(survey.responses.map((r) => r.user.id));
  const relevantMembers = survey.team === 0
    ? teamMembers
    : teamMembers.filter((m) => m.team === survey.team);
  const notResponded = relevantMembers.filter((m) => !respondedIds.has(m.id));

  useEffect(() => {
    if (!isEnglish) return;
    const texts = [
      survey.title,
      ...(survey.description ? [survey.description] : []),
      ...options,
      survey.createdBy.name,
      ...survey.responses.map(r => r.user.name),
      ...notResponded.map(m => m.name),
    ];
    if (texts.length > 0) translateTexts(texts);
  }, [isEnglish, survey.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate results
  const resultMap = new Map<string, number>();
  if (survey.type === "yes_no") {
    resultMap.set("yes", 0);
    resultMap.set("no", 0);
  } else {
    options.forEach((_, i) => resultMap.set(String(i), 0));
  }
  survey.responses.forEach((r) => {
    const ans = JSON.parse(r.answer);
    if (survey.type === "multi") {
      (ans as number[]).forEach((i: number) => resultMap.set(String(i), (resultMap.get(String(i)) || 0) + 1));
    } else {
      resultMap.set(String(ans), (resultMap.get(String(ans)) || 0) + 1);
    }
  });
  const totalResponses = survey.responses.length;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        {t.surveys.backToSurveys}
      </button>

      {isSagal && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm text-center font-medium">
          {t.surveys.sagalViewOnly}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-5">
        {/* Header */}
        {editing ? (
          <div className="space-y-3 border-b pb-4">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-dotan-green outline-none"
              placeholder={t.surveys.titlePlaceholder} />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[50px]"
              placeholder={t.surveys.descriptionOptional} />
            {survey.type !== "yes_no" && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-medium">{t.surveys.optionsLabel}</label>
                {editOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={opt} onChange={(e) => {
                      const newOpts = [...editOptions];
                      newOpts[i] = e.target.value;
                      setEditOptions(newOpts);
                    }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
                      placeholder={`${t.surveys.optionN} ${i + 1}`} />
                    {editOptions.length > 2 && (
                      <button type="button" onClick={() => setEditOptions(editOptions.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 px-2"><MdClose /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setEditOptions([...editOptions, ""])}
                  className="text-xs text-dotan-green hover:underline flex items-center gap-1"><MdAdd /> {t.surveys.addOption}</button>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">{t.surveys.cancel}</button>
              <button onClick={onSaveEdit} disabled={sending}
                className="px-4 py-1.5 text-sm bg-dotan-green-dark text-white rounded-lg hover:bg-dotan-green transition disabled:opacity-50">
                {sending ? t.surveys.saving : t.surveys.save}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800">{getTranslation(survey.title)}</h1>
                {isCreator && (
                  <button onClick={() => onStartEdit(survey)} className="text-gray-400 hover:text-gray-600 transition">
                    <MdEdit className="text-lg" />
                  </button>
                )}
              </div>
              {survey.description && <p className="text-sm text-gray-500 mt-1">{getTranslation(survey.description)}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{displayName(survey.createdBy, locale)}</span>
                <span>•</span>
                <span>{formatDate(survey.createdAt, dateLocale)}</span>
                <span>•</span>
                <span>{survey.team === 0 ? t.surveys.allPlatoon : `${t.surveys.teamN} ${survey.team}`}</span>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              survey.status === "active" ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}>
              {survey.status === "active" ? t.surveys.active : t.surveys.closed}
            </span>
          </div>
        )}

        {/* Voting section */}
        {survey.status === "active" && !isSagal && (
          <div className="border rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">
              {myAnswer !== null ? t.surveys.changeAnswer : t.surveys.vote}
            </h3>

            {survey.type === "yes_no" && (
              <div className="flex gap-3">
                <button onClick={() => onRespond(survey.id, "yes")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                    myAnswer === "yes" ? "bg-green-500 text-white" : "bg-green-50 text-green-600 border-2 border-green-200 hover:border-green-400"
                  }`}>
                  <MdThumbUp /> {t.surveys.yes}
                </button>
                <button onClick={() => onRespond(survey.id, "no")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                    myAnswer === "no" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-400"
                  }`}>
                  <MdThumbDown /> {t.surveys.no}
                </button>
              </div>
            )}

            {survey.type === "single" && (
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <button key={i} onClick={() => onRespond(survey.id, i)}
                    className={`w-full text-start p-3 rounded-lg text-sm transition flex items-center gap-2 ${
                      myAnswer === i ? "bg-dotan-green-dark text-white" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}>
                    <MdRadioButtonChecked className={myAnswer === i ? "text-white" : "text-gray-300"} />
                    {getTranslation(opt)}
                  </button>
                ))}
              </div>
            )}

            {survey.type === "multi" && (
              <MultiSelect options={options.map(o => getTranslation(o))} selected={myAnswer || []} onSubmit={(selected) => onRespond(survey.id, selected)} />
            )}
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 text-sm">{t.surveys.results} ({totalResponses}/{relevantMembers.length})</h3>

          {survey.type === "yes_no" && (
            <div className="space-y-2">
              {[{ key: "yes", label: t.surveys.yes, color: "bg-green-500" }, { key: "no", label: t.surveys.no, color: "bg-red-500" }].map(({ key, label, color }) => {
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
                    <span className="text-xs text-gray-400 w-8 text-end">{count}</span>
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
                    <span className="text-sm text-gray-600 flex-shrink-0 max-w-[120px] truncate">{getTranslation(opt)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-dotan-green rounded-full transition-all flex items-center justify-end px-2" style={{ width: `${Math.max(pct, 5)}%` }}>
                        <span className="text-xs text-white font-bold">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-end">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Who responded / didn't */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h4 className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1"><MdCheckCircle /> {t.surveys.answeredList} ({survey.responses.length})</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {survey.responses.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 text-xs">
                  <Avatar name={r.user.name} image={r.user.image} size="xs" />
                  <span className="truncate">{displayName(r.user, locale)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1"><MdPerson /> {t.surveys.notAnsweredList} ({notResponded.length})</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {notResponded.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Avatar name={m.name} image={m.image} size="xs" />
                  <span className="truncate">{displayName(m, locale)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creator actions */}
        {isCreator && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {survey.status === "active" ? (
              <button onClick={() => onClose(survey.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1">
                <MdLock /> {t.surveys.closeSurvey}
              </button>
            ) : (
              <button onClick={() => onReopen(survey.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1">
                <MdLockOpen /> {t.surveys.reopenSurvey}
              </button>
            )}
            <button onClick={() => onRemind(survey.id)} disabled={reminding}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center gap-1 disabled:opacity-50">
              <MdNotifications /> {reminding ? t.surveys.reminding : `${t.surveys.remind} (${notResponded.length})`}
            </button>
            <button onClick={() => onExport(survey)}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
              <MdDownload /> {t.surveys.export}
            </button>
            <button onClick={() => onDelete(survey.id)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1">
              <MdDelete /> {t.surveys.deleteSurvey}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
