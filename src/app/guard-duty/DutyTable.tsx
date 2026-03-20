"use client";

import {
  MdAccessTime, MdDownload, MdSecurity, MdSwapHoriz, MdGroups,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { Assignment, DutyTable as DutyTableType, ROLE_COLORS, ROLE_NOTES, DAY_ROLES } from "./constants";

interface DutyTableProps {
  table: DutyTableType;
  roles: string[];
  slots: string[];
  dayRoleAssignments: { role: string; people: Assignment[] }[];
  squads: { number: number; members: string[] }[];
  obsGdudi: string[];
  dateDisplay: string;
  userId: string | null;
  isRoni: boolean;
  onSwap: (a: Assignment) => void;
  onAppeal: (a: Assignment) => void;
  onExport: () => void;
}

export default function DutyTableView({
  table, roles, slots, dayRoleAssignments, squads, obsGdudi,
  dateDisplay, userId, isRoni, onSwap, onAppeal, onExport,
}: DutyTableProps) {
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-l from-gray-800 to-gray-900 px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <h2 className="text-white font-bold text-xs sm:text-sm truncate">{table.title} — {dateDisplay}</h2>
          <button onClick={onExport} className="text-white/60 hover:text-white transition"><MdDownload /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r border-gray-200 bg-gray-50 px-2 sm:px-3 py-2.5 text-gray-500 text-right font-bold sticky right-0 z-10 min-w-[60px] sm:min-w-[80px]">
                  <MdAccessTime className="inline text-sm ml-1" />משמרת
                </th>
                {roles.map(r => (
                  <th key={r} className={`border-b border-r border-gray-200 px-1.5 sm:px-2 py-2 text-center font-bold min-w-[75px] sm:min-w-[90px] ${ROLE_COLORS[r] || "bg-gray-700 text-white"}`}>
                    <div className="leading-tight text-[10px] sm:text-xs">{r}</div>
                    {ROLE_NOTES[r] && <div className="text-[8px] sm:text-[9px] font-normal opacity-70 mt-0.5">({ROLE_NOTES[r]})</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, si) => (
                <tr key={slot} className={si % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className={`border-b border-r border-gray-200 px-2 sm:px-3 py-2 font-bold text-gray-700 text-[10px] sm:text-xs sticky right-0 z-10 whitespace-nowrap ${si % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    {slot}
                  </td>
                  {roles.map(role => {
                    const found = table.assignments.filter(a => a.timeSlot === slot && a.role === role);
                    return (
                      <td key={role} className="border-b border-r border-gray-100 px-1.5 py-1.5 text-center">
                        {found.map(a => (
                          <div key={a.id} className="group relative">
                            <button
                              onClick={() => {
                                if (isRoni) onSwap(a);
                                else if (a.userId === userId) onAppeal(a);
                              }}
                              className={`inline-block px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition cursor-pointer ${
                                a.userId === userId
                                  ? "bg-dotan-green-dark text-white ring-2 ring-dotan-gold/50"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                              title={isRoni ? "החלף חייל" : a.userId === userId ? "ערער על שיבוץ" : a.user.name}>
                              {a.note && <span className="text-[8px] sm:text-[9px] opacity-60 block leading-none mb-0.5">{a.note}</span>}
                              {a.user.name}
                            </button>
                          </div>
                        ))}
                        {found.length === 0 && <span className="text-gray-300">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day-level roles */}
      {dayRoleAssignments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {dayRoleAssignments.map(({ role, people }) => (
            <div key={role} className={`rounded-xl border-2 p-3 ${ROLE_COLORS[role] ? "" : "border-gray-200"}`}
              style={{ borderColor: role === 'כ"כא' ? "#0d9488" : "#14b8a6" }}>
              <h4 className={`font-bold text-sm mb-2 flex items-center gap-2 ${role === 'כ"כא' ? "text-teal-700" : "text-teal-600"}`}>
                <MdSecurity /> {role} <span className="text-[10px] font-normal text-gray-400">(תפקיד יומי)</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {people.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-teal-100">
                    <Avatar name={a.user.name} image={a.user.image} size="xs" />
                    <span className="text-xs font-medium text-gray-700">{a.user.name}</span>
                    <span className="text-[10px] text-gray-400">{a.timeSlot}</span>
                    {isRoni && (
                      <button onClick={() => onSwap(a)}
                        className="text-blue-500 hover:text-blue-700 mr-auto">
                        <MdSwapHoriz className="text-sm" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Squads */}
      {squads.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <MdGroups className="text-indigo-500" /> חולייות
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-indigo-50 px-3 py-2 text-indigo-700 font-bold text-right">מס&apos; חולייה</th>
                  <th className="border-b border-gray-200 bg-indigo-50 px-3 py-2 text-indigo-700 font-bold text-right">צוער 1</th>
                  <th className="border-b border-gray-200 bg-indigo-50 px-3 py-2 text-indigo-700 font-bold text-right">צוער 2</th>
                  <th className="border-b border-gray-200 bg-indigo-50 px-3 py-2 text-indigo-700 font-bold text-right">צוער 3</th>
                </tr>
              </thead>
              <tbody>
                {squads.map((s, i) => (
                  <tr key={s.number} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border-b border-gray-100 px-3 py-2 font-bold text-indigo-600">{s.number}</td>
                    {s.members.map((name, j) => (
                      <td key={j} className="border-b border-gray-100 px-3 py-2 text-gray-700 font-medium">{name}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* עבס גדודי */}
      {obsGdudi.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <MdSecurity className="text-amber-600" /> עב&quot;ס גדודי
          </h3>
          <div className="flex flex-wrap gap-2">
            {obsGdudi.map((name, i) => (
              <span key={i} className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
