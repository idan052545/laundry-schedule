"use client";

import { MdPeople, MdClose, MdSave } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { UserOption } from "./types";

interface AssignModalProps {
  selectedUserIds: string[];
  allUsers: UserOption[];
  assignTeamFilter: string;
  userSearch: string;
  onToggleUser: (userId: string) => void;
  onTeamFilterChange: (filter: string) => void;
  onSearchChange: (search: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function AssignModal({
  selectedUserIds, allUsers, assignTeamFilter, userSearch,
  onToggleUser, onTeamFilterChange, onSearchChange, onSave, onClose,
}: AssignModalProps) {
  const filteredUsers = allUsers.filter((u) => {
    if (assignTeamFilter !== "all" && u.team !== parseInt(assignTeamFilter)) return false;
    if (userSearch && !u.name.includes(userSearch)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <MdPeople className="text-dotan-green" /> שיוך משתמשים
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <MdClose />
          </button>
        </div>
        <div className="p-3 border-b space-y-2 shrink-0">
          <input type="text" placeholder="חפש שם..." value={userSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <div className="flex gap-1.5 overflow-x-auto">
            {["all", "14", "15", "16", "17"].map((t) => (
              <button key={t} onClick={() => onTeamFilterChange(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${assignTeamFilter === t ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
                {t === "all" ? "הכל" : `צוות ${t}`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredUsers.map((u) => (
            <button key={u.id} onClick={() => onToggleUser(u.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition text-right ${selectedUserIds.includes(u.id) ? "bg-dotan-mint-light border border-dotan-green" : "hover:bg-gray-50 border border-transparent"}`}>
              <Avatar name={u.name} image={u.image} size="sm" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{u.name}</span>
                {u.team && <span className="text-xs text-gray-400 mr-2">צוות {u.team}</span>}
              </div>
              {selectedUserIds.includes(u.id) && (
                <span className="text-dotan-green text-lg">✓</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-3 border-t shrink-0">
          <button onClick={onSave}
            className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium text-sm flex items-center justify-center gap-2">
            <MdSave /> שמור ({selectedUserIds.length} נבחרו)
          </button>
        </div>
      </div>
    </div>
  );
}
