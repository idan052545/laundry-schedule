"use client";

import { RefObject } from "react";
import { MdStickyNote2, MdClose, MdPerson, MdPeople } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { ScheduleNote } from "./types";

interface NoteFormProps {
  noteFormRef: RefObject<HTMLDivElement | null>;
  editingNote: ScheduleNote | null;
  noteForm: { title: string; description: string; startTime: string; endTime: string; visibility: string };
  setNoteForm: (form: { title: string; description: string; startTime: string; endTime: string; visibility: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function NoteForm({ noteFormRef, editingNote, noteForm, setNoteForm, onSubmit, onClose }: NoteFormProps) {
  const { t } = useLanguage();
  return (
    <div ref={noteFormRef} className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300/60 rounded-2xl p-4 mb-3 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
            <MdStickyNote2 className="text-amber-500" />
            {editingNote ? t.schedule.editNote : t.schedule.newNote}
          </span>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition">
            <MdClose className="text-gray-500 text-sm" />
          </button>
        </div>
        <input type="text" placeholder={t.schedule.notePlaceholder} required value={noteForm.title}
          onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
          className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 placeholder:text-amber-300" />
        <textarea placeholder={t.schedule.noteDetails} value={noteForm.description}
          onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
          className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none placeholder:text-amber-300"
          rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="text-[10px] text-amber-600 font-medium block mb-1">{t.schedule.startTime}</label>
            <input type="time" value={noteForm.startTime}
              onChange={(e) => setNoteForm({ ...noteForm, startTime: e.target.value })}
              className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] text-amber-600 font-medium block mb-1">{t.schedule.endTime}</label>
            <input type="time" value={noteForm.endTime}
              onChange={(e) => setNoteForm({ ...noteForm, endTime: e.target.value })}
              className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={() => setNoteForm({ ...noteForm, visibility: "personal" })}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition ${
              noteForm.visibility === "personal"
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-amber-300"
            }`}>
            <MdPerson className="text-base" /> {t.schedule.onlyMe}
          </button>
          <button type="button"
            onClick={() => setNoteForm({ ...noteForm, visibility: "team" })}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition ${
              noteForm.visibility === "team"
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
            }`}>
            <MdPeople className="text-base" /> {t.schedule.myTeam}
          </button>
        </div>
        <button type="submit"
          className="w-full bg-gradient-to-l from-amber-600 to-amber-500 text-white py-2.5 rounded-xl hover:from-amber-700 hover:to-amber-600 transition font-bold text-sm shadow-sm">
          {editingNote ? t.schedule.updateNote : t.schedule.addNote}
        </button>
      </form>
    </div>
  );
}
