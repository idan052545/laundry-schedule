"use client";

import { useState } from "react";
import { MdArrowBack, MdCheckCircle } from "react-icons/md";
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
        <MdArrowBack /> חזרה
      </button>
      <h1 className="text-xl font-bold text-dotan-green-dark mb-4">{scenario ? "עריכת תרחיש" : "תרחיש חדש"}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">כותרת *</label>
            <input type="text" value={form.title} onChange={e => update("title", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">שם הדמות *</label>
            <input type="text" value={form.machineName} onChange={e => update("machineName", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required placeholder='לדוג׳: "רונה"' />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">תיאור (אופציונלי)</label>
          <textarea value={form.description} onChange={e => update("description", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">תפקיד הדמות / קונפליקט *</label>
          <input type="text" value={form.conflictCharacter} onChange={e => update("conflictCharacter", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required placeholder='לדוג׳: "חיילת מתלוננת על חלוקת המשימות"' />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">הקשר בין הדמות למשתמש *</label>
          <input type="text" value={form.relationship} onChange={e => update("relationship", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" required placeholder='לדוג׳: "חיילת בצוות שלך"' />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">רקע הסימולציה *</label>
          <textarea value={form.servicenature} onChange={e => update("servicenature", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[80px]" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">מטרת הסימולציה *</label>
          <textarea value={form.objective} onChange={e => update("objective", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">מוטיבציות הדמות *</label>
          <textarea value={form.machineMotivation} onChange={e => update("machineMotivation", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" required />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">נקודות מפתח / תורפה *</label>
          <textarea value={form.keypoints} onChange={e => update("keypoints", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">רמת קושי (1-10)</label>
            <input type="range" min={1} max={10} value={form.difficulty} onChange={e => update("difficulty", parseInt(e.target.value))}
              className="w-full" />
            <div className="text-center text-sm font-bold text-dotan-green">{form.difficulty}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">מגדר הדמות</label>
            <select value={form.soldierGender} onChange={e => update("soldierGender", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none">
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => update("active", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-dotan-green focus:ring-dotan-green" />
              פעיל
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="bg-dotan-green-dark text-white px-6 py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50">
            <MdCheckCircle /> {saving ? "שומר..." : scenario ? "שמור שינויים" : "צור תרחיש"}
          </button>
        </div>
      </form>
    </div>
  );
}
