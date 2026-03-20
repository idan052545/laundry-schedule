"use client";

import { useRef, useEffect } from "react";
import { MdAssignment, MdClose } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { CATEGORY_CONFIG, getCategoryLabels, PRIORITY_CONFIG, getPriorityLabels } from "./constants";
import { TaskFormData, Task } from "./types";

interface TaskFormProps {
  form: TaskFormData;
  setForm: (form: TaskFormData) => void;
  editingTask: Task | null;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function TaskForm({ form, setForm, editingTask, onSubmit, onClose }: TaskFormProps) {
  const { t } = useLanguage();
  const formRef = useRef<HTMLDivElement>(null);

  const categoryLabels = getCategoryLabels(t);
  const priorityLabels = getPriorityLabels(t);

  useEffect(() => {
    if (editingTask) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [editingTask]);

  return (
    <div ref={formRef} className="bg-white border-2 border-dotan-mint rounded-2xl p-4 mb-4 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-dotan-green-dark flex items-center gap-1.5">
            <MdAssignment className="text-dotan-green" />
            {editingTask ? t.tasks.editTask : t.tasks.newTask}
          </span>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <MdClose className="text-gray-500 text-sm" />
          </button>
        </div>

        <input type="text" placeholder={t.tasks.taskTitle} required value={form.title}
          onChange={e => setForm({...form, title: e.target.value})}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-dotan-green focus:border-dotan-green" />

        <textarea placeholder={t.tasks.descriptionOptional} value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-dotan-green resize-none" rows={2} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{t.tasks.type}</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm">
              {Object.keys(CATEGORY_CONFIG).map(k => <option key={k} value={k}>{categoryLabels[k]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{t.common.priority}</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-sm">
              {Object.keys(PRIORITY_CONFIG).map(k => <option key={k} value={k}>{priorityLabels[k]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 font-medium block mb-1">{t.common.date}</label>
            <input type="date" value={form.startDate}
              onChange={e => setForm({...form, startDate: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-red-500 font-medium block mb-1">{t.tasks.dueDate}</label>
            <input type="date" value={form.dueDate}
              onChange={e => setForm({...form, dueDate: e.target.value})}
              className="w-full border border-red-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-300" />
          </div>
        </div>

        {!form.allDay && (
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-[10px] text-gray-500 font-medium block mb-1">{t.schedule.startTime}</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm({...form, startTime: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-gray-500 font-medium block mb-1">{t.schedule.endTime}</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm({...form, endTime: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.allDay}
            onChange={e => setForm({...form, allDay: e.target.checked})}
            className="rounded border-gray-300 text-dotan-green focus:ring-dotan-green" />
          {t.common.allDay}
        </label>

        <button type="submit"
          className="w-full bg-dotan-green-dark text-white py-2.5 rounded-xl hover:bg-dotan-green transition font-bold text-sm">
          {editingTask ? t.tasks.updateTask : t.tasks.addTask}
        </button>
      </form>
    </div>
  );
}
