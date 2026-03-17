"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdSecurity, MdSwapHoriz, MdPerson, MdAdd, MdClose, MdCheck,
  MdDownload, MdWarning, MdAccessTime, MdGavel, MdTrendingUp,
  MdEdit, MdDelete, MdChevronRight, MdChevronLeft, MdSend,
  MdNotifications, MdInfo, MdBarChart, MdGroups,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import Avatar from "@/components/Avatar";

interface UserMin { id: string; name: string; team: number | null; image: string | null; }

interface Assignment {
  id: string;
  userId: string;
  timeSlot: string;
  role: string;
  note: string | null;
  user: UserMin;
}

interface DutyTable {
  id: string;
  title: string;
  date: string;
  type: string;
  roles: string;
  timeSlots: string;
  metadata: string | null;
  assignments: Assignment[];
}

interface Appeal {
  id: string;
  assignmentId: string;
  userId: string;
  user: UserMin;
  reason: string;
  suggestedUserId: string | null;
  suggestedUser: UserMin | null;
  status: string;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  "שג רכוב קדמי": "bg-purple-800 text-white",
  "שג רכוב אחורי": "bg-purple-600 text-white",
  "שג רגלי": "bg-gray-800 text-white",
  "פטל": "bg-red-600 text-white",
  "ימ\"ח": "bg-blue-700 text-white",
  "בונקר": "bg-red-700 text-white",
  "נשקייה": "bg-green-700 text-white",
  "תצפיתן": "bg-yellow-600 text-white",
  "עתודה": "bg-gray-600 text-white",
  "כ\"כא": "bg-teal-700 text-white",
  "כ\"כב": "bg-teal-500 text-white",
};

// Role notes visible in headers
const ROLE_NOTES: Record<string, string> = {
  "שג רכוב קדמי": "תמיד 2",
  "שג רכוב אחורי": "1 רק 5-17",
  "שג רגלי": "7:00-19:00",
};

const DEFAULT_GUARD_ROLES = [
  "שג רכוב קדמי", "שג רכוב אחורי", "שג רגלי", "פטל",
  "ימ\"ח", "בונקר", "נשקייה", "תצפיתן", "עתודה", "כ\"כא", "כ\"כב",
];

const DEFAULT_GUARD_SLOTS = [
  "08:00-12:00", "12:00-16:00", "16:00-20:00", "20:00-00:00", "00:00-04:00", "04:00-08:00",
];

// For עב"ס: "roles" = time columns, "timeSlots" = row numbers (person slots)
const DEFAULT_OBS_ROLES = ["08:30-11:30", "13:30-17:30", "18:30-20:00"];
const DEFAULT_OBS_SLOTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];

// Roles that are per-day (not per-shift) — excluded from hours and shown separately
const DAY_ROLES = ['כ"כא', 'כ"כב'];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
}

export default function GuardDutyPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const [date, setDate] = useState(toDateStr(new Date()));
  const [tableType, setTableType] = useState<"guard" | "obs">("guard");
  const [table, setTable] = useState<DutyTable | null>(null);
  const [allUsers, setAllUsers] = useState<UserMin[]>([]);
  const [isRoni, setIsRoni] = useState(false);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [initialDateSet, setInitialDateSet] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showPersonSummary, setShowPersonSummary] = useState<string | null>(null);
  const [showFairness, setShowFairness] = useState(false);
  const [swapping, setSwapping] = useState<Assignment | null>(null);
  const [swapUserId, setSwapUserId] = useState("");
  const [appealing, setAppealing] = useState<Assignment | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealSuggestion, setAppealSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createTitle, setCreateTitle] = useState("");
  const [createRoles, setCreateRoles] = useState<string[]>([]);
  const [createSlots, setCreateSlots] = useState<string[]>([]);
  const [createAssignments, setCreateAssignments] = useState<Record<string, Record<string, string>>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/guard-duty?date=${date}&type=${tableType}`);
    if (res.ok) {
      const data = await res.json();
      setTable(data.table);
      setAllUsers(data.allUsers);
      setIsRoni(data.isRoni);
      if (!data.isRoni) { router.push("/dashboard"); return; }
      setAppeals(data.appeals);
      setHoursMap(data.hoursMap);
      if (data.availableDates) setAvailableDates(data.availableDates);

      // On first load, if today has no data but there are dates with data, jump to the nearest one
      if (!initialDateSet && !data.table && data.availableDates?.length > 0) {
        const today = toDateStr(new Date());
        const sorted = [...data.availableDates].sort((a: string, b: string) =>
          Math.abs(new Date(a).getTime() - new Date(today).getTime()) -
          Math.abs(new Date(b).getTime() - new Date(today).getTime())
        );
        setInitialDateSet(true);
        setDate(sorted[0]);
        return; // will re-fetch with new date
      }
      setInitialDateSet(true);
    }
    setLoading(false);
  }, [date, tableType, initialDateSet]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") fetchData();
  }, [authStatus, router, fetchData]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toDateStr(d));
  };

  const handleSwap = async () => {
    if (!swapping || !swapUserId) return;
    setSubmitting(true);
    const res = await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "swap", assignmentId: swapping.id, newUserId: swapUserId }),
    });
    if (res.ok) {
      setSwapping(null); setSwapUserId("");
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSubmitting(false);
  };

  const handleAppeal = async () => {
    if (!appealing) return;
    setSubmitting(true);
    await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "appeal",
        assignmentId: appealing.id,
        reason: appealReason,
        suggestedUserId: appealSuggestion || null,
      }),
    });
    setAppealing(null); setAppealReason(""); setAppealSuggestion("");
    setSubmitting(false);
    await fetchData();
  };

  const handleResolveAppeal = async (appealId: string, approved: boolean) => {
    setSubmitting(true);
    const res = await fetch("/api/guard-duty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-appeal", appealId, approved }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSubmitting(false);
    await fetchData();
  };

  const initCreateForm = () => {
    const roles = tableType === "guard" ? [...DEFAULT_GUARD_ROLES] : [...DEFAULT_OBS_ROLES];
    const slots = tableType === "guard" ? [...DEFAULT_GUARD_SLOTS] : [...DEFAULT_OBS_SLOTS];
    setCreateRoles(roles);
    setCreateSlots(slots);
    setCreateTitle(tableType === "guard" ? "שיבוץ לשמירות" : `עב"ס בהד"י`);
    setCreateAssignments({});
    setShowCreate(true);
  };

  const setAssignment = (slot: string, role: string, uId: string) => {
    setCreateAssignments(prev => {
      const next = { ...prev };
      if (!next[slot]) next[slot] = {};
      next[slot] = { ...next[slot], [role]: uId };
      return next;
    });
  };

  const handleCreate = async () => {
    setSubmitting(true);
    const assignments: { userId: string; timeSlot: string; role: string }[] = [];
    for (const slot of createSlots) {
      for (const role of createRoles) {
        const uid = createAssignments[slot]?.[role];
        if (uid) assignments.push({ userId: uid, timeSlot: slot, role });
      }
    }
    const res = await fetch("/api/guard-duty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date, type: tableType, title: createTitle,
        roles: createRoles, timeSlots: createSlots, assignments,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      await fetchData();
    }
    setSubmitting(false);
  };

  const handleExportXlsx = async () => {
    if (!table) return;
    const XLSX = await import("xlsx");
    const roles: string[] = JSON.parse(table.roles);
    const slots: string[] = JSON.parse(table.timeSlots);

    const header = ["משמרת", ...roles];
    const rows = slots.map(slot => {
      const row: Record<string, string> = { "משמרת": slot };
      roles.forEach(role => {
        const found = table.assignments.filter(a => a.timeSlot === slot && a.role === role);
        row[role] = found.map(a => a.note ? `${a.note} ${a.user.name}` : a.user.name).join(", ");
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header });
    // RTL
    ws["!cols"] = header.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, table.title);
    XLSX.writeFile(wb, `${table.title}_${table.date}.xlsx`);
  };

  const handleDeleteTable = async () => {
    if (!table || !confirm("למחוק את הטבלה?")) return;
    await fetch(`/api/guard-duty?id=${table.id}`, { method: "DELETE" });
    await fetchData();
  };

  if (authStatus === "loading" || loading) return <InlineLoading />;

  const allRoles: string[] = table ? JSON.parse(table.roles) : [];
  const slots: string[] = table ? JSON.parse(table.timeSlots) : [];
  // Separate day-level roles (כ"כא, כ"כב) from shift roles
  const roles = allRoles.filter(r => !DAY_ROLES.includes(r));
  const dayRoleAssignments = table ? DAY_ROLES.map(role => ({
    role,
    people: [...new Map(
      table.assignments
        .filter(a => a.role === role)
        .map(a => [a.userId, a] as const)
    ).values()],
  })).filter(r => r.people.length > 0) : [];

  // Parse squads from metadata
  const squads: { number: number; members: string[] }[] = (() => {
    if (!table?.metadata) return [];
    try {
      const meta = JSON.parse(table.metadata);
      return meta.squads || [];
    } catch { return []; }
  })();

  // Parse עבס גדודי from metadata
  const obsGdudi: string[] = (() => {
    if (!table?.metadata) return [];
    try {
      const meta = JSON.parse(table.metadata);
      return meta.obsGdudi || [];
    } catch { return []; }
  })();

  // Per-person data for summary
  const getPersonAssignments = (personId: string) =>
    table?.assignments.filter(a => a.userId === personId) || [];

  const parseTimeRange = (range: string) => {
    const parts = range.split("-");
    if (parts.length !== 2) return 0;
    const [s, e] = parts;
    const sp = s.split(":").map(Number);
    const ep = e.split(":").map(Number);
    if (sp.length < 2 || ep.length < 2 || sp.some(isNaN) || ep.some(isNaN)) return 0;
    let h = (ep[0] * 60 + ep[1] - sp[0] * 60 - sp[1]) / 60;
    if (h < 0) h += 24;
    return h;
  };

  const getPersonHours = (personId: string) => {
    let total = 0;
    for (const a of getPersonAssignments(personId)) {
      if (DAY_ROLES.includes(a.role)) continue;
      const fromSlot = parseTimeRange(a.timeSlot);
      const fromRole = parseTimeRange(a.role);
      total += fromSlot > 0 ? fromSlot : fromRole;
    }
    return total;
  };

  // Fairness: all users with any assignments across all tables
  const fairnessData = allUsers
    .map(u => ({ ...u, hours: hoursMap[u.id] || 0 }))
    .filter(u => u.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  const avgHours = fairnessData.length > 0 ? fairnessData.reduce((s, u) => s + u.hours, 0) / fairnessData.length : 0;

  const dateDisplay = new Date(date + "T12:00:00").toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  // People assigned in this table
  const assignedPeople = table ? [...new Map(table.assignments.map(a => [a.userId, a.user])).values()] : [];

  // My assignments
  const myAssignments = table?.assignments.filter(a => a.userId === userId) || [];

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-dotan-green-dark flex items-center gap-2 shrink-0">
          <MdSecurity className="text-amber-600" /> שיבוץ תורנויות
        </h1>
        {isRoni && (
          <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
            {table && (
              <>
                <button onClick={handleExportXlsx}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium">
                  <MdDownload className="text-green-600" /> <span className="hidden sm:inline">XLSX</span>
                </button>
                <button onClick={handleDeleteTable}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium">
                  <MdDelete />
                </button>
              </>
            )}
            <button onClick={() => showCreate ? setShowCreate(false) : initCreateForm()}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg bg-dotan-green-dark text-white text-xs sm:text-sm font-medium hover:bg-dotan-green transition">
              {showCreate ? <><MdClose /> סגור</> : <><MdAdd /> טבלה חדשה</>}
            </button>
          </div>
        )}
      </div>

      {/* Type tabs + date nav */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTableType("guard")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${tableType === "guard" ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
            שמירות
          </button>
          <button onClick={() => setTableType("obs")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${tableType === "obs" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500"}`}>
            עב&quot;ס
          </button>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-3 py-2 flex-1 justify-between">
          <button onClick={() => changeDate(-1)} className="text-gray-400 hover:text-gray-600"><MdChevronRight /></button>
          <div className="text-center">
            <span className="text-sm font-bold text-gray-700">{dateDisplay}</span>
            {availableDates.includes(date) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-dotan-green mr-1 align-middle" />}
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="block text-[10px] text-gray-400 text-center mt-0.5 bg-transparent border-none outline-none cursor-pointer" />
          </div>
          <button onClick={() => changeDate(1)} className="text-gray-400 hover:text-gray-600"><MdChevronLeft /></button>
        </div>
      </div>

      {/* Roni quick actions */}
      {isRoni && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setShowFairness(!showFairness)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${showFairness ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <MdBarChart /> הוגנות
          </button>
          {appeals.filter(a => a.status === "pending").length > 0 && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 border border-red-200 text-red-600">
              <MdGavel /> {appeals.filter(a => a.status === "pending").length} ערעורים ממתינים
            </span>
          )}
        </div>
      )}

      {/* Create form */}
      {showCreate && isRoni && (
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
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
            <button onClick={handleCreate} disabled={submitting}
              className="px-5 py-2 bg-dotan-green-dark text-white rounded-lg text-sm font-medium hover:bg-dotan-green transition disabled:opacity-50 flex items-center gap-1">
              <MdSend /> {submitting ? "שומר..." : "שמור ושלח התראות"}
            </button>
          </div>
        </div>
      )}

      {/* Fairness panel (Roni only) */}
      {showFairness && isRoni && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 mb-6 shadow-sm">
          <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <MdTrendingUp /> סיכום הוגנות - שעות לכל חייל
            <span className="text-[10px] text-amber-500 font-normal mr-auto">ממוצע: {avgHours.toFixed(1)} שעות</span>
          </h3>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {fairnessData.map(u => {
              const diff = u.hours - avgHours;
              const isHigh = diff > avgHours * 0.2;
              const isLow = diff < -avgHours * 0.2;
              return (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <Avatar name={u.name} image={u.image} size="xs" />
                  <span className="font-medium text-gray-700 w-28 truncate">{u.name}</span>
                  <div className="flex-1 bg-white rounded-full h-4 overflow-hidden border border-amber-100">
                    <div className={`h-full rounded-full transition-all ${isHigh ? "bg-red-400" : isLow ? "bg-blue-400" : "bg-amber-400"}`}
                      style={{ width: `${Math.min((u.hours / (avgHours * 2)) * 100, 100)}%` }} />
                  </div>
                  <span className={`font-bold w-16 text-left ${isHigh ? "text-red-600" : isLow ? "text-blue-600" : "text-gray-600"}`}>
                    {u.hours.toFixed(1)}h
                  </span>
                  {isHigh && <MdWarning className="text-red-400 shrink-0" title="מעל הממוצע" />}
                  {isLow && <MdInfo className="text-blue-400 shrink-0" title="מתחת לממוצע" />}
                </div>
              );
            })}
          </div>
          {fairnessData.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-[11px] text-amber-700 font-medium">
                {fairnessData.filter(u => u.hours - avgHours > avgHours * 0.2).length > 0 && (
                  <>חיילים עם עומס גבוה (אדום): שקלי להפחית שעות ב{fairnessData.filter(u => u.hours - avgHours > avgHours * 0.2).map(u => u.name).join(", ")}. </>
                )}
                {fairnessData.filter(u => u.hours - avgHours < -avgHours * 0.2).length > 0 && (
                  <>חיילים עם עומס נמוך (כחול): אפשר להגדיל ל{fairnessData.filter(u => u.hours - avgHours < -avgHours * 0.2).map(u => u.name).join(", ")}.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pending appeals (Roni) */}
      {isRoni && appeals.filter(a => a.status === "pending").length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4 mb-6 space-y-3">
          <h3 className="font-bold text-red-700 flex items-center gap-2 text-sm"><MdGavel /> ערעורים ממתינים</h3>
          {appeals.filter(a => a.status === "pending").map(appeal => (
            <div key={appeal.id} className="bg-white rounded-xl p-3 border border-red-100 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar name={appeal.user.name} image={appeal.user.image} size="sm" />
                <div className="min-w-0">
                  <span className="font-bold text-sm text-gray-800">{appeal.user.name}</span>
                  <p className="text-xs text-gray-500 truncate">{appeal.reason || "ללא סיבה"}</p>
                  {appeal.suggestedUser && (
                    <span className="text-[10px] text-blue-600 font-medium">מציע: {appeal.suggestedUser.name}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleResolveAppeal(appeal.id, true)} disabled={submitting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 disabled:opacity-50">
                  <MdCheck /> אשר
                </button>
                <button onClick={() => handleResolveAppeal(appeal.id, false)} disabled={submitting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50">
                  <MdClose /> דחה
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No table */}
      {!table && !showCreate && (
        <div className="text-center py-16 text-gray-400">
          <MdSecurity className="text-5xl mx-auto mb-3 text-gray-300" />
          <p className="font-medium">אין שיבוץ ליום זה</p>
          {isRoni && <p className="text-sm mt-1">צרי טבלה חדשה</p>}
        </div>
      )}

      {/* Main table */}
      {table && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-l from-gray-800 to-gray-900 px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
              <h2 className="text-white font-bold text-xs sm:text-sm truncate">{table.title} — {dateDisplay}</h2>
              <button onClick={handleExportXlsx} className="text-white/60 hover:text-white transition"><MdDownload /></button>
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
                                    if (isRoni) { setSwapping(a); setSwapUserId(""); }
                                    else if (a.userId === userId) { setAppealing(a); setAppealReason(""); setAppealSuggestion(""); }
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

          {/* Day-level roles (כ"כא, כ"כב) */}
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
                          <button onClick={() => { setSwapping(a); setSwapUserId(""); }}
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

          {/* Squads (חולייות) */}
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

          {/* My assignments card */}
          {myAssignments.length > 0 && (
            <div className="bg-dotan-mint-light border-2 border-dotan-green rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-dotan-green-dark text-sm mb-2 flex items-center gap-2">
                <MdPerson /> השיבוצים שלי ({getPersonHours(userId!).toFixed(1)} שעות)
              </h3>
              <div className="space-y-1.5">
                {myAssignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-dotan-mint">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${ROLE_COLORS[a.role] || "bg-gray-600"}`}>{a.role}</span>
                      <span className="text-xs font-medium text-gray-600">{a.timeSlot}</span>
                    </div>
                    <button onClick={() => { setAppealing(a); setAppealReason(""); setAppealSuggestion(""); }}
                      className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 font-medium flex items-center gap-1">
                      <MdGavel /> ערער
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned people summary cards */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <MdPerson /> סיכום לפי חייל ({assignedPeople.length})
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
                      className={`w-full text-right bg-white rounded-xl p-3 border-2 transition hover:shadow-sm ${isOpen ? "border-dotan-green shadow-sm" : "border-gray-100"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={p.name} image={p.image} size="xs" />
                        <span className="font-bold text-xs text-gray-800 truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{localHrs.toFixed(1)} שעות (טבלה)</span>
                        <span>|</span>
                        <span className="font-bold text-gray-700">{totalHrs.toFixed(1)} שעות (סה&quot;כ)</span>
                        <span>|</span>
                        <span>{shiftTasks.length} משמרות</span>
                        {dayTasks.length > 0 && <span className="text-teal-600">+ {dayTasks.map(a => a.role).join(", ")}</span>}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="bg-gray-50 rounded-b-xl border-x-2 border-b-2 border-dotan-green px-3 py-2 space-y-1 -mt-1">
                        {tasks.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-white ${ROLE_COLORS[a.role] || "bg-gray-600"}`}>{a.role}</span>
                            <span className="text-gray-500">{a.timeSlot}</span>
                            {DAY_ROLES.includes(a.role) && <span className="text-[9px] text-teal-500">(יומי)</span>}
                            {isRoni && (
                              <button onClick={() => { setSwapping(a); setSwapUserId(""); }}
                                className="mr-auto text-blue-500 hover:text-blue-700"><MdSwapHoriz /></button>
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
        </>
      )}

      {/* Swap modal (Roni) */}
      {swapping && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSwapping(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <MdSwapHoriz className="text-blue-500" /> החלף חייל
            </h3>
            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
              <div>נוכחי: <strong>{swapping.user.name}</strong></div>
              <div>תפקיד: <strong>{swapping.role}</strong></div>
              <div>משמרת: <strong>{swapping.timeSlot}</strong></div>
            </div>
            <select value={swapUserId} onChange={e => setSwapUserId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">בחר חייל חדש</option>
              {allUsers.filter(u => u.id !== swapping.userId).map(u => (
                <option key={u.id} value={u.id}>{u.name} {u.team ? `(צוות ${u.team})` : ""}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSwapping(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
              <button onClick={handleSwap} disabled={!swapUserId || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                <MdSwapHoriz /> {submitting ? "מחליף..." : "החלף ושלח התראה"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal modal (everyone) */}
      {appealing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAppealing(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <MdGavel className="text-red-500" /> ערעור על שיבוץ
            </h3>
            <div className="bg-red-50 rounded-xl p-3 text-xs space-y-1">
              <div>תפקיד: <strong>{appealing.role}</strong></div>
              <div>משמרת: <strong>{appealing.timeSlot}</strong></div>
            </div>
            <textarea value={appealReason} onChange={e => setAppealReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none min-h-[80px]"
              placeholder="סיבה לערעור..." />
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">הצע מחליף (אופציונלי)</label>
              <select value={appealSuggestion} onChange={e => setAppealSuggestion(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">ללא הצעה</option>
                {allUsers.filter(u => u.id !== userId).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAppealing(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
              <button onClick={handleAppeal} disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                <MdNotifications /> {submitting ? "שולח..." : "שלח ערעור"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
