"use client";

import { useState } from "react";
import { MdAdd, MdClose, MdSend, MdPeople, MdGroups } from "react-icons/md";
import { getTypeConfig } from "./types";
import { useLanguage } from "@/i18n";

interface SurveyFormProps {
  userTeam: number;
  sending: boolean;
  onCreate: (data: { title: string; description: string | null; type: string; options?: string[]; platoon: boolean }) => Promise<boolean>;
  onClose: () => void;
}

export default function SurveyForm({ userTeam, sending, onCreate, onClose }: SurveyFormProps) {
  const { t } = useLanguage();
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("yes_no");
  const [formOptions, setFormOptions] = useState(["", ""]);
  const [formPlatoon, setFormPlatoon] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = formType !== "yes_no" ? formOptions.filter((o) => o.trim()) : undefined;
    const ok = await onCreate({ title: formTitle, description: formDesc || null, type: formType, options: opts, platoon: formPlatoon });
    if (ok) {
      setFormTitle(""); setFormDesc(""); setFormType("yes_no"); setFormOptions(["", ""]); setFormPlatoon(false);
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 space-y-3">
      <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
        placeholder={t.surveys.questionPlaceholder} required />

      <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]"
        placeholder={t.surveys.descriptionOptional} />

      {/* Type selector */}
      <div className="flex gap-2">
        {Object.entries(getTypeConfig(t)).map(([key, { label, icon: Icon }]) => (
          <button key={key} type="button" onClick={() => setFormType(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${
              formType === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            <Icon /> {label}
          </button>
        ))}
      </div>

      {/* Options for single/multi */}
      {formType !== "yes_no" && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500 font-medium">{t.surveys.optionsLabel}</label>
          {formOptions.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={opt} onChange={(e) => {
                const newOpts = [...formOptions];
                newOpts[i] = e.target.value;
                setFormOptions(newOpts);
              }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
                placeholder={`${t.surveys.optionN} ${i + 1}`} />
              {formOptions.length > 2 && (
                <button type="button" onClick={() => setFormOptions(formOptions.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 px-2">
                  <MdClose />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setFormOptions([...formOptions, ""])}
            className="text-xs text-dotan-green hover:underline flex items-center gap-1">
            <MdAdd /> {t.surveys.addOption}
          </button>
        </div>
      )}

      {/* Scope: team vs platoon */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setFormPlatoon(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${
            !formPlatoon ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          <MdPeople /> {t.surveys.teamN} {userTeam}
        </button>
        <button type="button" onClick={() => setFormPlatoon(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${
            formPlatoon ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          <MdGroups /> {t.surveys.allPlatoon}
        </button>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={sending}
          className="bg-dotan-green-dark text-white px-5 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
          <MdSend /> {sending ? t.surveys.creating : t.surveys.createSurvey}
        </button>
      </div>
    </form>
  );
}
