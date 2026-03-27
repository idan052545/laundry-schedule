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

export default function KitchenTableView({ table, dateDisplay, userId, isRoni, onSwap }: KitchenTableViewProps) {
  const { t, locale } = useLanguage();
  const shifts: string[] = JSON.parse(table.roles);

  // Group assignments by shift
  const shiftGroups = shifts.map(shift => ({
    shift,
    label: KITCHEN_SHIFT_LABELS[shift] || shift,
    color: KITCHEN_SHIFT_COLORS[shift] || "bg-gray-600 text-white",
    people: table.assignments
      .filter(a => a.role === shift)
      .sort((a, b) => parseInt(a.timeSlot) - parseInt(b.timeSlot)),
  }));

  // Max rows across all shifts
  const maxRows = Math.max(...shiftGroups.map(g => g.people.length), 1);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MdRestaurant className="text-orange-500 text-lg" />
        <h2 className="font-bold text-orange-800 text-sm">{table.title}</h2>
        <span className="text-[10px] text-gray-400">{dateDisplay}</span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-400 font-bold text-[10px] w-8">#</th>
              {shiftGroups.map(({ shift, label, color }) => (
                <th key={shift} className={`border border-gray-200 px-2 py-2 text-center ${color}`}>
                  <div className="font-bold text-sm">{label}</div>
                  <div className="text-[10px] opacity-80">{shift}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }, (_, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className={`border border-gray-200 px-2 py-1 text-center text-[10px] text-gray-400 font-bold ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  {i + 1}
                </td>
                {shiftGroups.map(({ shift, people }) => {
                  const a = people[i];
                  if (!a) {
                    return <td key={shift} className="border border-gray-100 px-2 py-1 text-center text-gray-300">—</td>;
                  }
                  const isMe = a.userId === userId;
                  return (
                    <td key={shift} className={`border border-gray-100 px-2 py-1 ${isMe ? "bg-orange-50" : ""}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className={`${isMe ? "text-orange-700 font-bold" : "text-gray-700"}`}>
                          {displayName(a.user, locale)}
                        </span>
                        {isRoni && (
                          <button onClick={() => onSwap(a)} className="text-gray-400 hover:text-orange-500 transition p-0.5 shrink-0">
                            <MdSwapHoriz className="text-sm" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td className="border border-gray-200 px-2 py-1 text-center text-[10px] text-gray-500 font-bold">
                {t.guardDuty.people}
              </td>
              {shiftGroups.map(({ shift, people }) => (
                <td key={shift} className="border border-gray-200 px-2 py-1 text-center text-[10px] text-gray-500 font-bold">
                  {people.length}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
