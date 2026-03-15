"use client";

import { MdClose, MdSave } from "react-icons/md";
import { TYPE_CONFIG, TARGET_LABELS } from "./constants";
import { EventFormData } from "./types";

interface EventFormProps {
  form: EventFormData;
  setForm: (form: EventFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEdit: boolean;
}

export default function EventForm({ form, setForm, onSubmit, onClose, isEdit }: EventFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-dotan-mint shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-dotan-green-dark text-white">
        <h3 className="font-bold text-sm">{isEdit ? "עריכת אירוע" : "הוספת אירוע"}</h3>
        <button type="button" onClick={onClose} className="text-white/70 hover:text-white"><MdClose /></button>
      </div>
      <div className="p-4 space-y-3">
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="כותרת האירוע" required
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent focus:bg-white outline-none" />
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="תיאור (אופציונלי)"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent focus:bg-white outline-none" />
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 pr-1">
            <input type="checkbox" checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="rounded border-gray-300 w-3.5 h-3.5" />
            כל היום
          </label>
          {!form.allDay && (
            <>
              <div className="h-4 w-px bg-gray-300" />
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required className="flex-1 bg-transparent text-sm text-center outline-none min-w-0" />
              <span className="text-gray-400 text-xs">—</span>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required className="flex-1 bg-transparent text-sm text-center outline-none min-w-0" />
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
            className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            {Object.entries(TARGET_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            {Object.entries(TYPE_CONFIG).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
          <MdSave /> {isEdit ? "שמור" : "הוסף"}
        </button>
      </div>
    </form>
  );
}
