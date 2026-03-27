"use client";

import { useState } from "react";
import { MdAutoAwesome, MdCheck, MdClose, MdTrendingUp, MdPeople, MdAccessTime, MdSecurity, MdSummarize, MdWarning } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { ROLE_COLORS, DAY_ROLES, UserMin, KITCHEN_SHIFT_LABELS, KITCHEN_SHIFT_COLORS, EXEMPTIONS, parseTimeRange } from "./constants";
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
  assignments: { userId: string; timeSlot: string; role: string; note?: string }[];
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
  assignments: { userId: string; timeSlot: string; role: string; note?: string }[];
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
        <div key={i} className="inline-block px-1 py-0.5 rounded bg-dotan-mint-light text-dotan-green-dark font-medium text-[9px]">
          {getUserName(a.userId, allUsers, locale)}
          {a.note && a.note !== a.timeSlot && (
            <div className="text-[8px] text-gray-400 font-normal">{a.note}</div>
          )}
        </div>
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

  // Count filled assignments (excluding day roles)
  const filledSlots = table.assignments.filter(a => !DAY_ROLES.includes(a.role)).length;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`text-xs font-bold ${isGuard ? "text-dotan-green-dark" : "text-amber-700"}`}>
          {table.title}
        </span>
        <span className="text-[10px] text-gray-400">({filledSlots} {t.guardDuty.people})</span>
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

      {/* Day roles (כ"כ) — show room number */}
      {dayAssigns.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {dayAssigns.map(({ role, people }) => {
            const roomNum = people.length > 0
              ? allUsers.find(u => u.id === people[0].userId)?.roomNumber
              : null;
            return (
              <div key={role} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 flex-wrap">
                <span className="text-[10px] font-bold text-teal-700">
                  {role}{roomNum ? ` (חדר ${roomNum})` : ""}:
                </span>
                {people.map(p => (
                  <span key={p.userId} className="text-[10px] font-medium text-teal-800">
                    {getUserName(p.userId, allUsers, locale)}
                  </span>
                ))}
              </div>
            );
          })}
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

  const shiftGroups = table.roles.map(shift => ({
    shift,
    label: KITCHEN_SHIFT_LABELS[shift] || shift,
    color: KITCHEN_SHIFT_COLORS[shift] || "bg-gray-600 text-white",
    people: table.assignments
      .filter(a => a.role === shift)
      .sort((a, b) => parseInt(a.timeSlot) - parseInt(b.timeSlot)),
  }));

  const maxRows = Math.max(...shiftGroups.map(g => g.people.length), 1);

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
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-1.5 py-1.5 text-gray-400 font-bold w-8">#</th>
              {shiftGroups.map(({ shift, label, color }) => (
                <th key={shift} className={`border border-gray-200 px-1.5 py-1.5 text-center ${color}`}>
                  <div className="font-bold text-xs">{label}</div>
                  <div className="text-[9px] opacity-80">{shift}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }, (_, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className={`border border-gray-200 px-1.5 py-0.5 text-center text-gray-400 font-bold ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  {i + 1}
                </td>
                {shiftGroups.map(({ shift, people }) => {
                  const a = people[i];
                  if (!a) return <td key={shift} className="border border-gray-100 px-1 py-0.5 text-center text-gray-300">—</td>;
                  return (
                    <EditableKitchenCell
                      key={shift}
                      assignment={a}
                      allUsers={allUsers}
                      locale={locale}
                      onEdit={(newUserId) => onEdit("kitchen", a.timeSlot, a.role, newUserId, a.userId)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td className="border border-gray-200 px-1.5 py-1 text-center text-gray-500 font-bold">{t.guardDuty.people}</td>
              {shiftGroups.map(({ shift, people }) => (
                <td key={shift} className="border border-gray-200 px-1.5 py-1 text-center text-gray-500 font-bold">{people.length}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[9px] text-orange-400 mt-1 px-1">{t.guardDuty.clickToEdit || "לחץ על תא לשינוי"}</p>
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
      <td className="border border-gray-100 px-0.5 py-0.5 text-center">
        <select
          autoFocus
          className="w-full text-[9px] border border-orange-300 rounded px-0.5 py-0.5 bg-white outline-none min-w-[70px]"
          defaultValue={assignment.userId}
          onChange={(e) => { onEdit(e.target.value); setEditing(false); }}
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
      className="border border-gray-100 px-1 py-0.5 text-center cursor-pointer hover:bg-orange-50 transition"
      onClick={() => setEditing(true)}
    >
      <span className="inline-block px-1 py-0.5 rounded bg-orange-50 text-orange-800 font-medium text-[9px]">
        {getUserName(assignment.userId, allUsers, locale)}
      </span>
    </td>
  );
}

function SummarySection({
  tables,
  allUsers,
  obsGdudi,
  locale,
}: {
  tables: Record<string, AutoFillTable>;
  allUsers: UserMin[];
  obsGdudi?: { userId: string; name: string; team: number }[];
  locale: string;
}) {
  const { t } = useLanguage();

  // Aggregate across all tables
  const allAssignedIds = new Set<string>();
  let totalHours = 0;
  let totalSlots = 0;

  for (const [, tbl] of Object.entries(tables)) {
    for (const a of tbl.assignments) {
      allAssignedIds.add(a.userId);
      if (!DAY_ROLES.includes(a.role)) {
        const h = parseTimeRange(a.note || a.timeSlot) || parseTimeRange(a.role);
        totalHours += h;
        totalSlots++;
      }
    }
  }

  // People NOT assigned at all
  const unassignedUsers = allUsers.filter(u => !allAssignedIds.has(u.id));

  // Exempted people in this assignment
  const exemptedInAssignment = EXEMPTIONS.filter(e =>
    [...allAssignedIds].some(id => {
      const u = allUsers.find(u => u.id === id);
      return u?.name === e.name;
    })
  );

  const exemptedNames = new Set(EXEMPTIONS.map(e => e.name));
  const exemptedNotAssigned = EXEMPTIONS.filter(e => !allAssignedIds.has(
    allUsers.find(u => u.name === e.name)?.id || ""
  ));

  // Per-person hours distribution
  const personHours: Record<string, number> = {};
  for (const [, tbl] of Object.entries(tables)) {
    for (const a of tbl.assignments) {
      if (DAY_ROLES.includes(a.role)) continue;
      const h = parseTimeRange(a.note || a.timeSlot) || parseTimeRange(a.role);
      if (h > 0) personHours[a.userId] = (personHours[a.userId] || 0) + h;
    }
  }
  const hValues = Object.values(personHours);
  const maxH = hValues.length > 0 ? Math.max(...hValues) : 0;
  const minH = hValues.length > 0 ? Math.min(...hValues) : 0;
  const avgH = hValues.length > 0 ? hValues.reduce((s, v) => s + v, 0) / hValues.length : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
      <h3 className="font-bold text-gray-700 text-xs mb-2.5 flex items-center gap-1.5">
        <MdSummarize className="text-indigo-500" /> {t.guardDuty.summary}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2 text-center">
          <div className="text-[10px] text-blue-500">{t.guardDuty.totalPeople}</div>
          <div className="text-sm font-bold text-blue-700">{allAssignedIds.size}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-2 text-center">
          <div className="text-[10px] text-green-500">{t.guardDuty.totalHours}</div>
          <div className="text-sm font-bold text-green-700">{totalHours.toFixed(0)}h</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-2 text-center">
          <div className="text-[10px] text-purple-500">{t.guardDuty.totalSlots}</div>
          <div className="text-sm font-bold text-purple-700">{totalSlots}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-center">
          <div className="text-[10px] text-amber-500">{t.guardDuty.hoursRange}</div>
          <div className="text-sm font-bold text-amber-700">{minH.toFixed(1)}-{maxH.toFixed(1)}h</div>
          <div className="text-[9px] text-amber-400">{t.guardDuty.average}: {avgH.toFixed(1)}h</div>
        </div>
      </div>

      {/* Exempted people info */}
      {exemptedNotAssigned.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold text-gray-500 mb-1">{t.guardDuty.exemptedNotAssigned}:</div>
          <div className="flex flex-wrap gap-1">
            {exemptedNotAssigned.map(e => (
              <span key={e.name} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-medium ${e.color}`} title={e.detail}>
                {e.name} <span className="opacity-60">({e.type})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unassigned people count */}
      {unassignedUsers.length > 0 && (
        <div className="text-[10px] text-gray-400">
          <MdWarning className="inline text-amber-400 text-xs align-middle" /> {unassignedUsers.filter(u => !exemptedNames.has(u.name)).length} {t.guardDuty.unassignedPeople}
        </div>
      )}
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

      {/* Summary */}
      <SummarySection tables={tables} allUsers={allUsers} obsGdudi={obsGdudi} locale={locale} />

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
