"use client";

import { MdClose, MdCheckCircle, MdSearch } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";
import { User } from "./types";

interface AssignModalProps {
  allUsers: User[];
  assignSelected: string[];
  setAssignSelected: React.Dispatch<React.SetStateAction<string[]>>;
  assignSearch: string;
  setAssignSearch: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSave: () => void;
}

export default function AssignModal({
  allUsers, assignSelected, setAssignSelected,
  assignSearch, setAssignSearch, onClose, onSave,
}: AssignModalProps) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">{t.issues.assignTitle}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose /></button>
        </div>
        <div className="p-3">
          <div className="relative">
            <MdSearch className="absolute right-3 top-2.5 text-gray-400" />
            <input type="text" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)}
              placeholder={t.issues.searchPlaceholder}
              className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {allUsers
            .filter((u) => u.name.includes(assignSearch))
            .map((u) => (
              <button key={u.id} onClick={() => setAssignSelected((prev) => prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-sm text-start transition ${
                  assignSelected.includes(u.id) ? "bg-dotan-mint-light border border-dotan-green" : "hover:bg-gray-50"
                }`}>
                <Avatar name={u.name} image={u.image} size="sm" />
                <span className="flex-1 truncate">{u.name}</span>
                {assignSelected.includes(u.id) && <MdCheckCircle className="text-dotan-green text-lg shrink-0" />}
              </button>
            ))}
        </div>
        <div className="p-3 border-t">
          <button onClick={onSave}
            className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg font-medium hover:bg-dotan-green transition">
            {t.common.save} ({assignSelected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
