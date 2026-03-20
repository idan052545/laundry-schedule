"use client";

import { useState } from "react";
import { MdArrowBack, MdCheckCircle } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { Scenario } from "./types";

export function ScenarioForm({ scenario, onBack, onSave }: {
  scenario?: Scenario;
  onBack: () => void;
  onSave: (data: Partial<Scenario>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: scenario?.title || "",
    description: scenario?.description || "",
    conflictCharacter: scenario?.conflictCharacter || "",
    machineName: scenario?.machineName || "",
    relationship: scenario?.relationship || "",
    servicenature: scenario?.servicenature || "",
    objective: scenario?.objective || "",
    machineMotivation: scenario?.machineMotivation || "",
    keypoints: scenario?.keypoints || "",
    difficulty: scenario?.difficulty || 5,
    soldierGender: scenario?.soldierGender || "female",
    active: scenario?.active ?? true,
  });
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const update = (key: string, value: string | number | boolean) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        <MdArrowBack /> {t.common.back}
      </button>
      <h1 className="text-xl font-bold text-dotan-green-dark mb-4">{scenario ? t.simulator.editScenario : t.simulator.newScenario}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.scenarioTitle}</label>
            <input type="text" value={form.title} onChange={e => update("title", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.characterName}</label>
            <input type="text" value={form.machineName} onChange={e => update("machineName", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required placeholder={t.simulator.characterNamePlaceholder} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.descriptionOptional}</label>
          <textarea value={form.description} onChange={e => update("description", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.conflictRole}</label>
          <input type="text" value={form.conflictCharacter} onChange={e => update("conflictCharacter", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required placeholder={t.simulator.conflictPlaceholder} />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.relationship}</label>
          <input type="text" value={form.relationship} onChange={e => update("relationship", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required placeholder={t.simulator.relationshipPlaceholder} />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.background}</label>
          <textarea value={form.servicenature} onChange={e => update("servicenature", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[80px]" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.simulationObjective}</label>
          <textarea value={form.objective} onChange={e => update("objective", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.characterMotivations}</label>
          <textarea value={form.machineMotivation} onChange={e => update("machineMotivation", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.keypoints}</label>
          <textarea value={form.keypoints} onChange={e => update("keypoints", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.difficultyLevel}</label>
            <input type="range" min={1} max={10} value={form.difficulty} onChange={e => update("difficulty", parseInt(e.target.value))}
              className="w-full" />
            <div className="text-center text-sm font-bold text-dotan-green">{form.difficulty}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">{t.simulator.characterGender}</label>
            <select value={form.soldierGender} onChange={e => update("soldierGender", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none">
              <option value="female">{t.simulator.female}</option>
              <option value="male">{t.simulator.male}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => update("active", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-dotan-green focus:ring-dotan-green" />
              {t.simulator.activeLabel}
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="bg-dotan-green-dark text-white px-6 py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50">
            <MdCheckCircle /> {saving ? t.common.saving : scenario ? t.simulator.saveChanges : t.simulator.createScenario}
          </button>
        </div>
      </form>
    </div>
  );
}
