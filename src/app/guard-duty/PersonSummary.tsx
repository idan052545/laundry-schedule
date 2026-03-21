"use client";

import { MdPerson, MdSwapHoriz } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { Assignment, UserMin, ROLE_COLORS, DAY_ROLES } from "./constants";
import { useEffect } from "react";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface PersonSummaryProps {
  assignedPeople: UserMin[];
  hoursMap: Record<string, number>;
  getPersonAssignments: (personId: string) => Assignment[];
  getPersonHours: (personId: string) => number;
  showPersonSummary: string | null;
  setShowPersonSummary: (v: string | null) => void;
  isRoni: boolean;
  onSwap: (a: Assignment) => void;
}

export default function PersonSummary({
  assignedPeople, hoursMap, getPersonAssignments, getPersonHours,
  showPersonSummary, setShowPersonSummary, isRoni, onSwap,
}: PersonSummaryProps) {
  const { t, locale } = useLanguage();  return (
    <div className="mb-6">
      <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
        <MdPerson /> {t.guardDuty.personSummary} ({assignedPeople.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {assignedPeople.map(p => {
          const localHrs = getPersonHours(p.id);
          const totalHrs = hoursMap[p.id] || 0;
          const tasks = getPersonAssignments(p.id);
          const shiftTasks = tasks.filter(a => !DAY_ROLES.includes(a.role));
          const dayTasks = tasks.filter(a => DAY_ROLES.includes(a.role));
          const isOpen = showPersonSummary === p.id;
          return (
            <div key={p.id}>
              <button onClick={() => setShowPersonSummary(isOpen ? null : p.id)}
                className={`w-full text-start bg-white rounded-xl p-3 border-2 transition hover:shadow-sm ${isOpen ? "border-dotan-green shadow-sm" : "border-gray-100"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar name={p.name} image={p.image} size="xs" />
                  <span className="font-bold text-xs text-gray-800 truncate">{displayName(p, locale)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>{localHrs.toFixed(1)} {t.guardDuty.hoursTable}</span>
                  <span>|</span>
                  <span className="font-bold text-gray-700">{totalHrs.toFixed(1)} {t.guardDuty.hoursTotal}</span>
                  <span>|</span>
                  <span>{shiftTasks.length} {t.guardDuty.shifts}</span>
                  {dayTasks.length > 0 && <span className="text-teal-600">+ {dayTasks.map(a => a.role).join(", ")}</span>}
                </div>
              </button>
              {isOpen && (
                <div className="bg-gray-50 rounded-b-xl border-x-2 border-b-2 border-dotan-green px-3 py-2 space-y-1 -mt-1">
                  {tasks.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-white ${ROLE_COLORS[a.role] || "bg-gray-600"}`}>{a.role}</span>
                      <span className="text-gray-500">{a.timeSlot}</span>
                      {DAY_ROLES.includes(a.role) && <span className="text-[9px] text-teal-500">({t.guardDuty.daily})</span>}
                      {isRoni && (
                        <button onClick={() => onSwap(a)}
                          className="me-auto text-blue-500 hover:text-blue-700"><MdSwapHoriz /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
