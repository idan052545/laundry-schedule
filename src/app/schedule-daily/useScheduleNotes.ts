"use client";

import { useState, useCallback, useRef } from "react";
import { ScheduleNote } from "./types";

export function useScheduleNotes(date: string) {
  const [notes, setNotes] = useState<ScheduleNote[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<ScheduleNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", description: "", startTime: "", endTime: "", visibility: "personal" });
  const [noteReminding, setNoteReminding] = useState<string | null>(null);
  const noteFormRef = useRef<HTMLDivElement>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/schedule/notes?date=${date}`);
    if (res.ok) setNotes(await res.json());
  }, [date]);

  const resetNoteForm = () => {
    setNoteForm({ title: "", description: "", startTime: "", endTime: "", visibility: "personal" });
    setEditingNote(null);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/schedule/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...noteForm, date }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [...prev, note]);
      setShowNoteForm(false);
      resetNoteForm();
    }
  };

  const handleEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    const res = await fetch("/api/schedule/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingNote.id, ...noteForm }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      setShowNoteForm(false);
      resetNoteForm();
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("למחוק הערה זו?")) return;
    const res = await fetch(`/api/schedule/notes?id=${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleRemindNote = async (id: string) => {
    setNoteReminding(id);
    await fetch("/api/schedule/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "remind" }),
    });
    setNoteReminding(null);
  };

  const openEditNote = (note: ScheduleNote) => {
    setNoteForm({
      title: note.title,
      description: note.description || "",
      startTime: note.startTime || "",
      endTime: note.endTime || "",
      visibility: note.visibility,
    });
    setEditingNote(note);
    setShowNoteForm(true);
    setTimeout(() => noteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  return {
    notes, showNoteForm, setShowNoteForm, editingNote,
    noteForm, setNoteForm, noteReminding, noteFormRef,
    fetchNotes, resetNoteForm,
    handleAddNote, handleEditNote, handleDeleteNote,
    handleRemindNote, openEditNote,
  };
}
