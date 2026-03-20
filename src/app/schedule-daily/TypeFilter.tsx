"use client";

import { MdFilterList, MdPeople } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { TYPE_CONFIG, getTypeLabels } from "./constants";

interface TypeFilterProps {
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  targetFilter: string;
  setTargetFilter: (v: string) => void;
  userTeam: number | null;
  isAdmin: boolean;
}

export default function TypeFilter({ typeFilter, setTypeFilter, targetFilter, setTargetFilter, userTeam, isAdmin }: TypeFilterProps) {
  const { t } = useLanguage();
  const typeLabels = getTypeLabels(t);

  return (
    <>
      {/* Type filter */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
        <MdFilterList className="text-gray-400 shrink-0" />
        <button onClick={() => setTypeFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${typeFilter === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
          {t.common.all}
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, { icon: Icon }]) => (
          <button key={key} onClick={() => setTypeFilter(key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1 shrink-0 ${typeFilter === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
            <Icon className="text-xs" /> {typeLabels[key]}
          </button>
        ))}
      </div>

      {/* Target filter (platoon / team) — non-admin only */}
      {userTeam && !isAdmin && (
        <div className="flex items-center gap-1.5 mb-3">
          <MdPeople className="text-gray-400 shrink-0" />
          <button onClick={() => setTargetFilter("all")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${targetFilter === "all" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}>
            {t.common.all}
          </button>
          <button onClick={() => setTargetFilter("platoon")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${targetFilter === "platoon" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600"}`}>
            {t.schedule.platoon}
          </button>
          <button onClick={() => setTargetFilter("team")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${targetFilter === "team" ? "bg-cyan-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            {t.common.team} {userTeam}
          </button>
        </div>
      )}
    </>
  );
}
