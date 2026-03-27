"use client";

import { useState } from "react";
import { MdAutoAwesome, MdCheck, MdClose, MdTrendingUp, MdPeople, MdAccessTime, MdSecurity } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { ROLE_COLORS, DAY_ROLES, UserMin, KITCHEN_SHIFT_LABELS, KITCHEN_SHIFT_COLORS } from "./constants";
import { displayName } from "@/lib/displayName";

interface AutoFillStats {
  totalHours: number;
  usersUsed: number;
  fairnessScore: number;
}

export interface AutoFillTable {
  title: string;
  roles: string[];
  timeSlots: string[];
  assignments: { userId: string; timeSlot: string; role: string }[];
  stats: AutoFillStats;
}

interface AutoFillPreviewProps {
  tables: Record<string, AutoFillTable>;
  allUsers: UserMin[];
  submitting: boolean;
  obsGdudi?: { userId: string; name: string; team: number }[];
  onApply: () => void;
  onCancel: () => void;
  onEditAssignment: (tableType: string, slot: string, role: string, newUserId: string, oldUserId?: string) => void;
}

function getUserName(userId: string, allUsers: UserMin[], locale: string): string {
  const u = allUsers.find(u => u.id === userId);
  return u ? displayName(u, locale) : "?";
}

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${color}`}>
      {icon}
      <div>
        <div className="text-[9px] text-gray-500">{label}</div>
        <div className="text-xs font-bold">{value}</div>
      </div>
    </div>
  );
}

/** Inline editable cell — click to change person */
function EditableCell({
  assignments,
  allUsers,
  locale,
  tableType,
  slot,
  role,
  onEdit,
}: {
  assignments: { userId: string; timeSlot: string; role: string }[];
  allUsers: UserMin[];
  locale: string;
  tableType: string;
  slot: string;
  role: string;
  onEdit: (tableType: string, slot: string, role: string, newUserId: string, oldUserId?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const found = assignments.filter(a => a.timeSlot === slot && a.role === role);

  if (editing) {
    return (
      <td className="border border-gray-100 px-0.5 py-0.5 text-center">
        <select
          autoFocus
          className="w-full text-[9px] border border-indigo-300 rounded px-0.5 py-0.5 bg-white outline-none min-w-[70px]"
          defaultValue={found[0]?.userId || ""}
          onChange={(e) => {
            onEdit(tableType, slot, role, e.target.value, found[0]?.userId);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        >
          <option value="">—</option>
          {allUsers.map(u => (
            <option key={u.id} value={u.id}>{displayName(u, locale)}</option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <td
      className="border border-gray-100 px-1 py-0.5 text-center cursor-pointer hover:bg-indigo-50 transition"
      onClick={() => setEditing(true)}
      title="לחץ לשינוי"
    >
      {found.map((a, i) => (
        <span key={i} className="inline-block px-1 py-0.5 rounded bg-dotan-mint-light text-dotan-green-dark font-medium text-[9px]">
          {getUserName(a.userId, allUsers, locale)}
        </span>
      ))}
      {found.length === 0 && <span className="text-gray-300">-</span>}
    </td>
  );
}

function TablePreview({
  type,
  table,
  allUsers,
  locale,
  onEdit,
}: {
  type: string;
  table: AutoFillTable;
  allUsers: UserMin[];
  locale: string;
  onEdit: AutoFillPreviewProps["onEditAssignment"];
}) {
  const { t } = useLanguage();
  const isGuard = type === "guard";
  const roles = table.roles.filter(r => !DAY_ROLES.includes(r));
  const dayRoles = table.roles.filter(r => DAY_ROLES.includes(r));

  const dayAssigns = dayRoles.map(role => ({
    role,
    people: table.assignments.filter(a => a.role === role),
  })).filter(r => r.people.length > 0);

  // Count unfilled slots
  let totalSlots = 0;
  let filledSlots = 0;
  for (const slot of table.timeSlots) {
    for (const role of roles) {
      totalSlots++;
      if (table.assignments.some(a => a.timeSlot === slot && a.role === role)) filledSlots++;
    }
  }
  const unfilled = totalSlots - filledSlots;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`text-xs font-bold ${isGuard ? "text-dotan-green-dark" : "text-amber-700"}`}>
          {table.title}
        </span>
        <span className="text-[10px] text-gray-400">({filledSlots}/{totalSlots})</span>
        {/* All slots guaranteed filled by algorithm */}
      </div>

      {/* Stats */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <StatBadge
          icon={<MdAccessTime className="text-blue-500 text-sm" />}
          label={t.guardDuty.hours}
          value={`${table.stats.totalHours.toFixed(0)}h`}
          color="bg-blue-50 border-blue-200"
        />
        <StatBadge
          icon={<MdPeople className="text-green-600 text-sm" />}
          label={t.guardDuty.personSummary}
          value={String(table.stats.usersUsed)}
          color="bg-green-50 border-green-200"
        />
        <StatBadge
          icon={<MdTrendingUp className={`text-sm ${table.stats.fairnessScore >= 70 ? "text-green-600" : table.stats.fairnessScore >= 40 ? "text-amber-500" : "text-red-500"}`} />}
          label={t.guardDuty.fairness}
          value={`${table.stats.fairnessScore}%`}
          color={table.stats.fairnessScore >= 70 ? "bg-green-50 border-green-200" : table.stats.fairnessScore >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}
        />
      </div>

      {/* Day roles */}
      {dayAssigns.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {dayAssigns.map(({ role, people }) => (
            <div key={role} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 flex-wrap">
              <span className="text-[10px] font-bold text-teal-700">{role}:</span>
              {people.map(p => (
                <span key={p.userId} className="text-[10px] font-medium text-teal-800">
                  {getUserName(p.userId, allUsers, locale)}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Table — click any cell to edit */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-1.5 py-1.5 text-gray-500 font-bold sticky right-0 z-10">
                {t.guardDuty.shift}
              </th>
              {roles.map(r => (
                <th key={r} className={`border border-gray-200 px-1 py-1 text-center text-white font-bold ${ROLE_COLORS[r] || "bg-gray-700"}`}>
                  <div className="text-[9px] leading-tight">{r}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.timeSlots.map((slot, si) => (
              <tr key={slot} className={si % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className={`border border-gray-200 px-1.5 py-1 font-bold text-gray-600 sticky right-0 z-10 whitespace-nowrap ${si % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  {slot}
                </td>
                {roles.map(role => (
                  <EditableCell
                    key={role}
                    assignments={table.assignments}
                    allUsers={allUsers}
                    locale={locale}
                    tableType={type}
                    slot={slot}
                    role={role}
                    onEdit={onEdit}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-indigo-400 mt-1 px-1">{t.guardDuty.clickToEdit || "לחץ על תא לשינוי"}</p>
    </div>
  );
}

function KitchenPreview({
  table,
  allUsers,
  locale,
  onEdit,
}: {
  table: AutoFillTable;
  allUsers: UserMin[];
  locale: string;
  onEdit: AutoFillPreviewProps["onEditAssignment"];
}) {
  const { t } = useLanguage();
  const shifts = table.roles;

  const shiftGroups = shifts.map(shift => ({
    shift,
    label: KITCHEN_SHIFT_LABELS[shift] || shift,
    color: KITCHEN_SHIFT_COLORS[shift] || "bg-gray-600 text-white",
    people: table.assignments
      .filter(a => a.role === shift)
      .sort((a, b) => parseInt(a.timeSlot) - parseInt(b.timeSlot)),
  }));

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs font-bold text-orange-700">{table.title}</span>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <StatBadge
          icon={<MdPeople className="text-orange-600 text-sm" />}
          label={t.guardDuty.personSummary}
          value={String(table.stats.usersUsed)}
          color="bg-orange-50 border-orange-200"
        />
        <StatBadge
          icon={<MdTrendingUp className={`text-sm ${table.stats.fairnessScore >= 70 ? "text-green-600" : "text-amber-500"}`} />}
          label={t.guardDuty.fairness}
          value={`${table.stats.fairnessScore}%`}
          color={table.stats.fairnessScore >= 70 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}
        />
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
              {people.map((a, i) => (
                <EditableKitchenCell
                  key={i}
                  assignment={a}
                  allUsers={allUsers}
                  locale={locale}
                  onEdit={(newUserId) => onEdit("kitchen", a.timeSlot, a.role, newUserId, a.userId)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-orange-400 mt-1 px-1">{t.guardDuty.clickToEdit || "לחץ על שם לשינוי"}</p>
    </div>
  );
}

function EditableKitchenCell({
  assignment,
  allUsers,
  locale,
  onEdit,
}: {
  assignment: { userId: string; timeSlot: string; role: string };
  allUsers: UserMin[];
  locale: string;
  onEdit: (newUserId: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="px-3 py-1.5 bg-white">
        <select
          autoFocus
          className="w-full text-[10px] border border-orange-300 rounded px-1 py-0.5 bg-white outline-none"
          defaultValue={assignment.userId}
          onChange={(e) => { onEdit(e.target.value); setEditing(false); }}
          onBlur={() => setEditing(false)}
        >
          <option value="">—</option>
          {allUsers.map(u => (
            <option key={u.id} value={u.id}>{displayName(u, locale)}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className="px-3 py-1.5 text-xs text-gray-700 bg-white cursor-pointer hover:bg-orange-50 transition"
      onClick={() => setEditing(true)}
    >
      {getUserName(assignment.userId, allUsers, locale)}
    </div>
  );
}

export default function AutoFillPreview({ tables, allUsers, submitting, obsGdudi, onApply, onCancel, onEditAssignment }: AutoFillPreviewProps) {
  const { t, locale } = useLanguage();

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-4 mb-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <MdAutoAwesome className="text-indigo-500 text-lg" />
        <h2 className="font-bold text-indigo-800 text-sm">{t.guardDuty.autoFillPreview}</h2>
        <span className="text-[10px] text-indigo-400 me-auto">{t.guardDuty.autoFillDesc}</span>
      </div>

      {tables.guard && <TablePreview type="guard" table={tables.guard} allUsers={allUsers} locale={locale} onEdit={onEditAssignment} />}
      {tables.obs && <TablePreview type="obs" table={tables.obs} allUsers={allUsers} locale={locale} onEdit={onEditAssignment} />}
      {tables.kitchen && <KitchenPreview table={tables.kitchen} allUsers={allUsers} locale={locale} onEdit={onEditAssignment} />}

      {/* עב"ס גדודי */}
      {obsGdudi && obsGdudi.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-3 mb-4">
          <h3 className="font-bold text-amber-700 text-xs mb-2 flex items-center gap-1.5">
            <MdSecurity className="text-amber-600" /> {t.guardDuty.obsGdudi}
          </h3>
          <div className="flex flex-wrap gap-2">
            {obsGdudi.map(g => (
              <span key={g.userId} className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-medium">
                {g.name} <span className="text-[10px] text-amber-500">({t.guardDuty.squadNumber} {g.team})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-indigo-200">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:bg-white rounded-lg transition">
          <MdClose className="inline text-sm me-1" /> {t.common.cancel}
        </button>
        <button onClick={onApply} disabled={submitting}
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-md">
          <MdCheck className="text-base" /> {submitting ? t.guardDuty.sending : t.guardDuty.applyAutoFill}
        </button>
      </div>
    </div>
  );
}
