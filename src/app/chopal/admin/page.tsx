"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdLocalHospital, MdFileDownload, MdChevronRight, MdChevronLeft,
  MdDelete, MdPeople, MdPhone, MdNote, MdNotifications, MdPersonOff,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import Avatar from "@/components/Avatar";
import * as XLSX from "xlsx";

interface ChopalUser {
  id: string;
  name: string;
  team: number | null;
  image: string | null;
  phone: string | null;
}

interface ChopalRequest {
  id: string;
  userId: string;
  date: string;
  needed: boolean;
  note: string | null;
  createdAt: string;
  user: ChopalUser;
}

interface AdminData {
  date: string;
  requests: ChopalRequest[];
  byTeam: Record<number, ChopalRequest[]>;
  total: number;
  isAdmin: boolean;
}

const TEAM_COLORS: Record<number, string> = {
  14: "bg-blue-50 border-blue-200 text-blue-700",
  15: "bg-emerald-50 border-emerald-200 text-emerald-700",
  16: "bg-purple-50 border-purple-200 text-purple-700",
  17: "bg-amber-50 border-amber-200 text-amber-700",
  0: "bg-gray-50 border-gray-200 text-gray-700",
};

const TEAM_NAMES: Record<number, string> = {
  14: "צוות 14",
  15: "צוות 15",
  16: "צוות 16",
  17: "צוות 17",
  0: "ללא צוות",
};

export default function ChopalAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => {
    // Default to tomorrow
    const d = new Date();
    const il = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    il.setDate(il.getDate() + 1);
    return `${il.getFullYear()}-${(il.getMonth() + 1).toString().padStart(2, "0")}-${il.getDate().toString().padStart(2, "0")}`;
  });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/chopal?admin=true&date=${date}`);
    if (res.ok) {
      setData(await res.json());
    } else {
      router.push("/chopal");
    }
    setLoading(false);
  }, [date, router]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק בקשה זו?")) return;
    setDeleting(id);
    const res = await fetch(`/api/chopal?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchData();
    setDeleting(null);
  };

  const handleNotifyAll = async () => {
    if (!confirm('לשלוח תזכורת לכולם להירשם לחופ"ל?')) return;
    setNotifying(true);
    try {
      await fetch("/api/chopal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify", date }),
      });
      alert("התזכורת נשלחה לכולם!");
    } catch { alert("שגיאה בשליחה"); }
    setNotifying(false);
  };

  const handleNotifyMissing = async () => {
    if (!confirm("לשלוח תזכורת רק למי שלא נרשם?")) return;
    setNotifying(true);
    try {
      const res = await fetch("/api/chopal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify-missing", date }),
      });
      const data = await res.json();
      alert(`נשלחה תזכורת ל-${data.notified} חיילים שלא נרשמו`);
    } catch { alert("שגיאה בשליחה"); }
    setNotifying(false);
  };

  const handleExport = async () => {
    const res = await fetch("/api/chopal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) { alert("שגיאה בייצוא"); return; }
    const exportData = await res.json();

    const wb = XLSX.utils.book_new();

    // All requests sheet
    const ws = XLSX.utils.json_to_sheet(exportData.rows);
    ws["!cols"] = [
      { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "כל הבקשות");

    // Per team sheets
    if (data?.byTeam) {
      for (const teamNum of [14, 15, 16, 17]) {
        const teamReqs = data.byTeam[teamNum] || [];
        if (teamReqs.length === 0) continue;
        const teamRows = teamReqs.map((r) => ({
          שם: r.user.name,
          טלפון: r.user.phone || "-",
          הערה: r.note || "-",
          "זמן הרשמה": new Date(r.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
        }));
        const teamWs = XLSX.utils.json_to_sheet(teamRows);
        teamWs["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, teamWs, `צוות ${teamNum}`);
      }
    }

    const formatted = formatDate(date);
    XLSX.writeFile(wb, `מסדר_חופל_${formatted}.xlsx`);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
  };

  if (status === "loading" || loading) return <InlineLoading />;
  if (!data) return null;

  const teamNums = Object.keys(data.byTeam).map(Number).sort((a, b) => a - b);

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow">
            <MdLocalHospital className="text-xl text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">ניהול מסדר חופ&quot;ל</h1>
            <p className="text-xs text-gray-500">{data.total} נרשמו</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={data.total === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold shadow hover:bg-green-600 transition disabled:opacity-50"
        >
          <MdFileDownload className="text-base" />
          ייצוא Excel
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2 mb-4">
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MdChevronRight className="text-xl text-gray-600" />
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-800 text-sm">{formatDate(date)}</div>
        </div>
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <MdChevronLeft className="text-xl text-gray-600" />
        </button>
      </div>

      {/* Notify buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleNotifyAll}
          disabled={notifying}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold shadow hover:bg-blue-600 transition disabled:opacity-50"
        >
          <MdNotifications className="text-sm" />
          {notifying ? "שולח..." : "תזכורת לכולם"}
        </button>
        <button
          onClick={handleNotifyMissing}
          disabled={notifying}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow hover:bg-orange-600 transition disabled:opacity-50"
        >
          <MdPersonOff className="text-sm" />
          {notifying ? "שולח..." : "תזכורת למי שלא נרשם"}
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-sm font-bold text-rose-700 shrink-0">
          <MdPeople className="text-base" />
          {data.total} סה&quot;כ
        </div>
        {teamNums.map((team) => (
          <div key={team} className={`px-2.5 py-1.5 rounded-full border text-xs font-bold shrink-0 ${TEAM_COLORS[team] || TEAM_COLORS[0]}`}>
            {TEAM_NAMES[team] || `צוות ${team}`}: {data.byTeam[team]?.length || 0}
          </div>
        ))}
      </div>

      {/* Team groups */}
      {data.total === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
          <MdLocalHospital className="text-4xl text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">אין נרשמים עדיין</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teamNums.map((team) => {
            const reqs = data.byTeam[team] || [];
            if (reqs.length === 0) return null;
            const colors = TEAM_COLORS[team] || TEAM_COLORS[0];

            return (
              <div key={team} className={`rounded-2xl border-2 overflow-hidden ${colors.split(" ").slice(1).join(" ")}`}>
                {/* Team header */}
                <div className={`px-4 py-2.5 ${colors.split(" ")[0]} flex items-center justify-between`}>
                  <h3 className="font-bold text-sm">{TEAM_NAMES[team] || `צוות ${team}`}</h3>
                  <span className="text-xs font-medium">{reqs.length} נרשמים</span>
                </div>

                {/* Members list */}
                <div className="divide-y divide-gray-100 bg-white">
                  {reqs.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={req.user.name} image={req.user.image} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{req.user.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {req.user.phone && (
                            <a href={`tel:${req.user.phone}`} className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:underline">
                              <MdPhone className="text-xs" />
                              {req.user.phone}
                            </a>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(req.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                          </span>
                        </div>
                        {req.note && (
                          <div className="flex items-start gap-1 mt-1">
                            <MdNote className="text-xs text-gray-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-gray-500 leading-relaxed">{req.note}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(req.id)}
                        disabled={deleting === req.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition disabled:opacity-50"
                      >
                        <MdDelete className="text-base" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
