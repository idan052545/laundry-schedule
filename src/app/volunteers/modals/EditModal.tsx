"use client";

import { MdEdit } from "react-icons/md";
import type { VolRequest } from "../types";

interface EditModalProps {
  editingRequest: VolRequest;
  editForm: { title: string; description: string; startTime: string; endTime: string; requiredCount: number };
  setEditForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; startTime: string; endTime: string; requiredCount: number }>>;
  submitting: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function EditModal({
  editingRequest, editForm, setEditForm, submitting, onClose, onEdit,
}: EditModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdEdit className="text-blue-500" /> עריכת תורנות</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">שם</label>
            <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">תיאור</label>
            <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-xs font-medium text-gray-600 mb-1 block">התחלה</label>
              <input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-center" />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-gray-600 mb-1 block">סיום</label>
              <input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-center" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">כמות מתנדבים</label>
            <input type="number" min={1} max={50} value={editForm.requiredCount}
              onChange={e => setEditForm(f => ({ ...f, requiredCount: parseInt(e.target.value) || 1 }))}
              className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-center" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onEdit} disabled={submitting || !editForm.title}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
            {submitting ? "שומר..." : "שמור"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">ביטול</button>
        </div>
      </div>
    </div>
  );
}
