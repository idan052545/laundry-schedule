"use client";

import { MdEdit, MdClose, MdSend } from "react-icons/md";
import { ROLE_COLORS, ROLE_NOTES, UserMin } from "./constants";

interface CreateFormProps {
  table: boolean;
  createTitle: string;
  setCreateTitle: (v: string) => void;
  createRoles: string[];
  createSlots: string[];
  createAssignments: Record<string, Record<string, string>>;
  setAssignment: (slot: string, role: string, uId: string) => void;
  allUsers: UserMin[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function CreateForm({
  table, createTitle, setCreateTitle, createRoles, createSlots,
  createAssignments, setAssignment, allUsers, submitting, onClose, onSubmit,
}: CreateFormProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dotan-mint p-4 mb-6 space-y-4 shadow-md">
      <h2 className="font-bold text-dotan-green-dark flex items-center gap-2">
        <MdEdit /> {table ? "ערוך טבלה" : "טבלה חדשה"}
      </h2>
      <input type="text" value={createTitle} onChange={e => setCreateTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium" placeholder="כותרת" />

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-2 py-2 text-gray-500 sticky right-0 z-10">משמרת</th>
              {createRoles.map(r => (
                <th key={r} className={`border border-gray-200 px-2 py-1.5 text-white text-center ${ROLE_COLORS[r] || "bg-gray-700"}`}>
                  <div className="text-[10px] leading-tight">{r}</div>
                  {ROLE_NOTES[r] && <div className="text-[8px] font-normal opacity-70">({ROLE_NOTES[r]})</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {createSlots.map(slot => (
              <tr key={slot}>
                <td className="border border-gray-200 bg-gray-50 px-2 py-1.5 font-bold text-gray-600 sticky right-0 z-10 whitespace-nowrap">{slot}</td>
                {createRoles.map(role => (
                  <td key={role} className="border border-gray-200 px-1 py-1">
                    <select
                      value={createAssignments[slot]?.[role] || ""}
                      onChange={e => setAssignment(slot, role, e.target.value)}
                      className="w-full text-[11px] border-none bg-transparent p-1 outline-none min-w-[80px]">
                      <option value="">-</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
        <button onClick={onSubmit} disabled={submitting}
          className="px-5 py-2 bg-dotan-green-dark text-white rounded-lg text-sm font-medium hover:bg-dotan-green transition disabled:opacity-50 flex items-center gap-1">
          <MdSend /> {submitting ? "שומר..." : "שמור ושלח התראות"}
        </button>
      </div>
    </div>
  );
}
