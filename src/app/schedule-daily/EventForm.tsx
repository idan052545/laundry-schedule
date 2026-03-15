"use client";

import { useState } from "react";
import { MdClose, MdSave, MdPersonAdd, MdSearch } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { TYPE_CONFIG, TARGET_LABELS } from "./constants";
import { EventFormData, UserOption } from "./types";

interface EventFormProps {
  form: EventFormData;
  setForm: (form: EventFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEdit: boolean;
  allUsers: UserOption[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
}

export default function EventForm({
  form, setForm, onSubmit, onClose, isEdit,
  allUsers, selectedUserIds, onSelectedUserIdsChange,
}: EventFormProps) {
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberTeamFilter, setMemberTeamFilter] = useState("all");

  const filteredUsers = allUsers.filter((u) => {
    if (memberTeamFilter !== "all" && u.team !== parseInt(memberTeamFilter)) return false;
    if (memberSearch && !u.name.includes(memberSearch)) return false;
    return true;
  });

  const toggleUser = (userId: string) => {
    onSelectedUserIdsChange(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((id) => id !== userId)
        : [...selectedUserIds, userId]
    );
  };

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

        {/* Time inputs — dir="ltr" to fix RTL reversal */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-2" dir="ltr">
          {!form.allDay && (
            <>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required className="flex-1 bg-transparent text-sm text-center outline-none min-w-0" />
              <span className="text-gray-400 text-xs">—</span>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required className="flex-1 bg-transparent text-sm text-center outline-none min-w-0" />
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0" dir="rtl">
            <input type="checkbox" checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="rounded border-gray-300 w-3.5 h-3.5" />
            כל היום
          </label>
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

        {/* Member selection */}
        <div>
          <button type="button" onClick={() => setShowMembers(!showMembers)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition">
            <span className="flex items-center gap-1.5">
              <MdPersonAdd className="text-sm text-gray-400" />
              שיוך חיילים
              {selectedUserIds.length > 0 && (
                <span className="bg-dotan-green text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {selectedUserIds.length}
                </span>
              )}
            </span>
            <span className="text-gray-400">{showMembers ? "▲" : "▼"}</span>
          </button>

          {showMembers && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
              {/* Search & team filter */}
              <div className="p-2 bg-gray-50 border-b space-y-1.5">
                <div className="relative">
                  <MdSearch className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input type="text" placeholder="חפש שם..." value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pr-7 pl-2 py-1.5 border border-gray-200 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-dotan-green" />
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {["all", "14", "15", "16", "17"].map((t) => (
                    <button key={t} type="button" onClick={() => setMemberTeamFilter(t)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${memberTeamFilter === t ? "bg-dotan-green-dark text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
                      {t === "all" ? "הכל" : `צוות ${t}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected chips */}
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 bg-dotan-mint-light/30 border-b">
                  {selectedUserIds.map((uid) => {
                    const user = allUsers.find((u) => u.id === uid);
                    if (!user) return null;
                    return (
                      <button key={uid} type="button" onClick={() => toggleUser(uid)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-white border border-dotan-green rounded-full text-[10px] text-gray-700 hover:bg-red-50 hover:border-red-300 transition">
                        {user.name}
                        <MdClose className="text-[10px] text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* User list */}
              <div className="max-h-40 overflow-y-auto">
                {filteredUsers.map((u) => (
                  <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-right transition text-xs ${selectedUserIds.includes(u.id) ? "bg-dotan-mint-light/50" : "hover:bg-gray-50"}`}>
                    <Avatar name={u.name} image={u.image} size="xs" />
                    <span className="flex-1 text-gray-700">{u.name}</span>
                    {u.team && <span className="text-[10px] text-gray-400">צוות {u.team}</span>}
                    {selectedUserIds.includes(u.id) && (
                      <span className="text-dotan-green font-bold text-sm">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button type="submit"
          className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
          <MdSave /> {isEdit ? "שמור" : "הוסף"}
        </button>
      </div>
    </form>
  );
}
