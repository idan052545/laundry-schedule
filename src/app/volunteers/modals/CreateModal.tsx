"use client";

import { MdAdd, MdClose } from "react-icons/md";
import { CATEGORY_CONFIG } from "../constants";
import type { TitleSuggestion } from "../types";

interface VolunteerForm {
  title: string; description: string; target: string; requiredCount: number;
  startTime: string; endTime: string; category: string; priority: string;
  targetDetails: { team: number; count: number }[];
  allowPartial: boolean;
}

interface CreateModalProps {
  isCommander: boolean;
  form: VolunteerForm;
  setForm: React.Dispatch<React.SetStateAction<VolunteerForm>>;
  showTitleSuggestions: boolean;
  setShowTitleSuggestions: (v: boolean) => void;
  filteredSuggestions: TitleSuggestion[];
  submitting: boolean;
  onClose: () => void;
  onCreate: () => void;
}

type FormType = CreateModalProps["form"];

export default function CreateModal({
  isCommander, form, setForm, showTitleSuggestions, setShowTitleSuggestions,
  filteredSuggestions, submitting, onClose, onCreate,
}: CreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MdAdd className="text-green-600" /> {isCommander ? "יצירת תורנות" : "בקשת עזרה"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose className="text-xl" /></button>
        </div>

        {!isCommander && (
          <p className="text-xs text-gray-400 mb-3 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            בקשת עזרה היא פניה ידידותית לחברי הפלוגה — לא חובה, אבל כל עזרה מתקבלת בברכה
          </p>
        )}

        <div className="space-y-4">
          <div className="relative">
            <label className="text-xs font-medium text-gray-600 mb-1 block">{isCommander ? "שם התורנות *" : "במה צריך עזרה? *"}</label>
            <input value={form.title} onChange={e => { setForm((f: FormType) => ({ ...f, title: e.target.value })); setShowTitleSuggestions(true); }}
              onFocus={() => setShowTitleSuggestions(true)}
              placeholder="לדוגמה: ניקיון חדר אוכל" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 transition" />
            {showTitleSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map(s => (
                  <button key={s.id} onClick={() => { setForm((f: FormType) => ({ ...f, title: s.title, category: s.category })); setShowTitleSuggestions(false); }}
                    className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between">
                    <span>{s.title}</span>
                    <span className="text-[10px] text-gray-400">{s.usageCount}×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">תיאור</label>
            <textarea value={form.description} onChange={e => setForm((f: FormType) => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="פירוט נוסף..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-300 transition" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">קטגוריה</label>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} onClick={() => setForm((f: FormType) => ({ ...f, category: key }))}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
                      form.category === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}>
                    <Icon className="text-sm" /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">מי צריך?</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "all", label: "כל הפלוגה" },
                { key: "team-14", label: "צוות 14" },
                { key: "team-15", label: "צוות 15" },
                { key: "team-16", label: "צוות 16" },
                { key: "team-17", label: "צוות 17" },
                { key: "mixed", label: "מעורב" },
              ].map(t => (
                <button key={t.key} onClick={() => setForm((f: FormType) => ({ ...f, target: t.key }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
                    form.target === t.key ? "bg-green-600 text-white border-green-600" : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.target === "mixed" && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="text-[11px] font-medium text-gray-600">כמה מכל צוות?</div>
              {[14, 15, 16, 17].map(team => {
                const detail = form.targetDetails.find(d => d.team === team);
                return (
                  <div key={team} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 w-16">צוות {team}</span>
                    <input type="number" min={0} max={20} value={detail?.count || 0}
                      onChange={e => {
                        const count = parseInt(e.target.value) || 0;
                        setForm((f: FormType) => {
                          const details = f.targetDetails.filter(d => d.team !== team);
                          if (count > 0) details.push({ team, count });
                          return { ...f, targetDetails: details, requiredCount: details.reduce((s, d) => s + d.count, 0) };
                        });
                      }}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {form.target !== "mixed" && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">כמה מתנדבים?</label>
                <input type="number" min={1} max={50} value={form.requiredCount}
                  onChange={e => setForm((f: FormType) => ({ ...f, requiredCount: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-center focus:ring-2 focus:ring-green-300 transition" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">עדיפות</label>
              <div className="flex gap-2">
                <button onClick={() => setForm((f: FormType) => ({ ...f, priority: "normal" }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${form.priority === "normal" ? "bg-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                  רגיל
                </button>
                <button onClick={() => setForm((f: FormType) => ({ ...f, priority: "urgent" }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${form.priority === "urgent" ? "bg-red-600 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                  דחוף!
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-xs font-medium text-gray-600 mb-1 block">התחלה *</label>
              <input type="time" value={form.startTime} onChange={e => setForm((f: FormType) => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-center focus:ring-2 focus:ring-green-300 transition" />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-gray-600 mb-1 block">סיום *</label>
              <input type="time" value={form.endTime} onChange={e => setForm((f: FormType) => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-center focus:ring-2 focus:ring-green-300 transition" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!form.allowPartial}
              onChange={e => setForm((f: FormType) => ({ ...f, allowPartial: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <span className="text-xs text-gray-600">אפשר שיבוץ חלקי (למי שיש לוז חופף רק בחלק מהזמן)</span>
          </label>

          <button onClick={onCreate} disabled={submitting || !form.title || !form.startTime || !form.endTime}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg hover:bg-green-700 transition disabled:opacity-50">
            {submitting ? "שולח..." : isCommander ? "פרסם תורנות" : "שלח בקשת עזרה"}
          </button>
        </div>
      </div>
    </div>
  );
}
