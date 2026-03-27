"use client";

import { MdRestaurant, MdSwapHoriz } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { DutyTable, Assignment, KITCHEN_SHIFT_LABELS, KITCHEN_SHIFT_COLORS } from "./constants";
import { displayName } from "@/lib/displayName";

interface KitchenTableViewProps {
  table: DutyTable;
  dateDisplay: string;
  userId: string | null;
  isRoni: boolean;
  onSwap: (a: Assignment) => void;
  onExport: () => void;
}

export default function KitchenTableView({ table, dateDisplay, userId, isRoni, onSwap, onExport }: KitchenTableViewProps) {
  const { t, locale } = useLanguage();
  const roles: string[] = JSON.parse(table.roles); // shifts

  // Group assignments by shift (role)
  const shiftGroups = roles.map(shift => ({
    shift,
    label: KITCHEN_SHIFT_LABELS[shift] || shift,
    color: KITCHEN_SHIFT_COLORS[shift] || "bg-gray-600 text-white",
    people: table.assignments
      .filter(a => a.role === shift)
      .sort((a, b) => parseInt(a.timeSlot) - parseInt(b.timeSlot)),
  }));

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MdRestaurant className="text-orange-500 text-lg" />
        <h2 className="font-bold text-orange-800 text-sm">{table.title}</h2>
        <span className="text-[10px] text-gray-400">{dateDisplay}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {shiftGroups.map(({ shift, label, color, people }) => (
          <div key={shift} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className={`${color} px-3 py-2 text-center`}>
              <div className="font-bold text-sm">{label}</div>
              <div className="text-[10px] opacity-80">{shift}</div>
              <div className="text-[10px] opacity-70">{people.length} {t.guardDuty.people}</div>
            </div>
            <div className="divide-y divide-gray-100">
              {people.map((a) => {
                const isMe = a.userId === userId;
                return (
                  <div key={a.id} className={`flex items-center justify-between px-3 py-1.5 text-xs ${isMe ? "bg-orange-50 font-bold" : "bg-white"}`}>
                    <span className={isMe ? "text-orange-700" : "text-gray-700"}>
                      {displayName(a.user, locale)}
                    </span>
                    {isRoni && (
                      <button onClick={() => onSwap(a)} className="text-gray-400 hover:text-orange-500 transition p-0.5">
                        <MdSwapHoriz className="text-sm" />
                      </button>
                    )}
                  </div>
                );
              })}
              {people.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-300 text-xs">—</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
