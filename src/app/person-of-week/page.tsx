"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdEmojiEvents, MdSend, MdSearch, MdDownload,
  MdChevronRight, MdChevronLeft, MdCheckCircle, MdStar,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";

interface User {
  id: string;
  name: string;
  image: string | null;
}

interface LeaderboardEntry {
  user: User;
  votes: number;
  reasons: string[];
  rank: number;
}

interface WeeklyVoteData {
  week: string;
  isCurrentWeek: boolean;
  weekStart: string;
  weekEnd: string;
  userVote: { nomineeId: string; reason: string | null } | null;
  leaderboard: LeaderboardEntry[];
  totalVoters: number;
  totalUsers: number;
  allUsers: User[];
  showDetails: boolean;
}

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];
const MEDAL_BG = ["bg-yellow-50 border-yellow-300", "bg-gray-50 border-gray-300", "bg-amber-50 border-amber-300"];

export default function PersonOfWeekPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [data, setData] = useState<WeeklyVoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchData = useCallback(async (offset: number) => {
    setLoading(true);
    const weekParam = offset !== 0 ? `?week=${getWeekString(offset)}` : "";
    const res = await fetch(`/api/weekly-vote${weekParam}`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      if (d.userVote) {
        setSelectedUser(d.userVote.nomineeId);
        setReason(d.userVote.reason || "");
      } else {
        setSelectedUser(null);
        setReason("");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") fetchData(weekOffset);
  }, [authStatus, router, fetchData, weekOffset]);

  const handleVote = async () => {
    if (!selectedUser) return;
    setSending(true);
    const res = await fetch("/api/weekly-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomineeId: selectedUser, reason: reason || null }),
    });
    if (res.ok) {
      await fetchData(weekOffset);
    }
    setSending(false);
  };

  const handleExportReasons = (entry: LeaderboardEntry) => {
    const rows = entry.reasons.map((r, i) => ({ "#": i + 1, סיבה: r }));
    const headers = ["#", "סיבה"];
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `איש_השבוע_${entry.user.name}_${data?.week}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString("he-IL", { day: "numeric", month: "short" })} - ${e.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}`;
  };

  if (authStatus === "loading" || loading) return <InlineLoading />;
  if (!data) return null;

  const filteredUsers = data.allUsers.filter(
    (u) => u.id !== userId && u.name.includes(search)
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <MdEmojiEvents className="text-5xl text-yellow-500 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-dotan-green-dark">איש/אשת השבוע</h1>
        <p className="text-sm text-gray-500 mt-1">בחרו את מי שהכי בלט השבוע</p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => setWeekOffset((p) => p - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
          <MdChevronRight />
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-800">{data.week}</div>
          <div className="text-xs text-gray-400">{formatWeekRange(data.weekStart, data.weekEnd)}</div>
          {data.isCurrentWeek && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">שבוע נוכחי</span>}
        </div>
        <button onClick={() => setWeekOffset((p) => Math.min(p + 1, 0))} disabled={weekOffset >= 0}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 disabled:opacity-30">
          <MdChevronLeft />
        </button>
      </div>

      {/* Leaderboard */}
      {data.leaderboard.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-1">
            <MdStar className="text-yellow-500" /> טבלת מובילים ({data.totalVoters}/{data.totalUsers} הצביעו)
          </h2>

          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1, 0, 2].map((podiumIdx) => {
              const entry = data.leaderboard[podiumIdx];
              if (!entry) return <div key={podiumIdx} />;
              const isMe = entry.user.id === userId;
              return (
                <div key={entry.user.id} className={`text-center p-3 rounded-xl border-2 ${MEDAL_BG[entry.rank - 1]} ${podiumIdx === 0 ? "mt-4" : podiumIdx === 1 ? "" : "mt-6"}`}>
                  <div className="text-2xl mb-1">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</div>
                  <Avatar name={entry.user.name} image={entry.user.image} size="md" />
                  <h3 className={`font-bold text-sm mt-2 truncate ${isMe ? "text-dotan-green-dark" : "text-gray-800"}`}>{entry.user.name}</h3>
                  <div className={`text-lg font-bold ${MEDAL_COLORS[entry.rank - 1]}`}>{entry.votes}</div>
                  <div className="text-[10px] text-gray-400">הצבעות</div>
                  {/* Download reasons if it's the user's own card and there are reasons */}
                  {isMe && entry.reasons.length > 0 && (
                    <button onClick={() => handleExportReasons(entry)}
                      className="mt-2 text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 justify-center">
                      <MdDownload /> הורד תשובות
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rest of leaderboard */}
          {data.leaderboard.slice(3).map((entry) => {
            const isMe = entry.user.id === userId;
            return (
              <div key={entry.user.id} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg mb-1 ${isMe ? "bg-dotan-mint-light" : ""}`}>
                <span className="text-sm text-gray-400 w-6 text-center font-bold">{entry.rank}</span>
                <Avatar name={entry.user.name} image={entry.user.image} size="sm" />
                <span className={`flex-1 text-sm truncate ${isMe ? "font-bold text-dotan-green-dark" : "text-gray-700"}`}>{entry.user.name}</span>
                <span className="text-sm font-bold text-gray-500">{entry.votes}</span>
                {isMe && entry.reasons.length > 0 && (
                  <button onClick={() => handleExportReasons(entry)} className="text-blue-500 hover:text-blue-700">
                    <MdDownload className="text-lg" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Show reasons for past weeks */}
          {data.showDetails && data.leaderboard.length > 0 && data.leaderboard[0].reasons.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <h4 className="text-xs font-medium text-yellow-700 mb-2">למה {data.leaderboard[0].user.name}?</h4>
              <div className="space-y-1">
                {data.leaderboard[0].reasons.map((r, i) => (
                  <p key={i} className="text-xs text-yellow-800">• {r}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {data.leaderboard.length === 0 && (
        <div className="text-center py-8 text-gray-400 mb-6">
          <MdEmojiEvents className="text-4xl mx-auto mb-2 text-gray-300" />
          <p className="text-sm">אין הצבעות עדיין לשבוע זה</p>
        </div>
      )}

      {/* Voting section (only current week) */}
      {data.isCurrentWeek && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            {data.userVote ? <><MdCheckCircle className="text-green-500" /> שנה הצבעה</> : "הצבע"}
          </h2>

          {/* Search */}
          <div className="relative">
            <MdSearch className="absolute right-3 top-2.5 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש חייל/ת..."
              className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" />
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUsers.map((u) => (
              <button key={u.id} onClick={() => setSelectedUser(u.id)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-sm text-right transition ${
                  selectedUser === u.id ? "bg-dotan-mint-light border-2 border-dotan-green" : "hover:bg-gray-50 border-2 border-transparent"
                }`}>
                <Avatar name={u.name} image={u.image} size="sm" />
                <span className="flex-1 truncate">{u.name}</span>
                {selectedUser === u.id && <MdCheckCircle className="text-dotan-green text-lg shrink-0" />}
              </button>
            ))}
          </div>

          {/* Reason */}
          {selectedUser && (
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]"
              placeholder="למה? (אופציונלי)" />
          )}

          {/* Submit */}
          <button onClick={handleVote} disabled={!selectedUser || sending}
            className="w-full bg-dotan-green-dark text-white py-3 rounded-xl font-bold hover:bg-dotan-green transition disabled:opacity-50 flex items-center justify-center gap-2">
            <MdSend /> {sending ? "שולח..." : data.userVote ? "עדכן הצבעה" : "הצבע"}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper to get ISO week string with offset
function getWeekString(offset: number): string {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
