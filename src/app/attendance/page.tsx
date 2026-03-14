"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MdCheckCircle, MdCancel, MdGroup } from "react-icons/md";
import Avatar from "@/components/Avatar";

interface UserWithAttendance {
  id: string;
  name: string;
  team: number | null;
  image: string | null;
  roomNumber: string | null;
  attendance: { id: string; present: boolean } | null;
}

const SESSIONS = [
  { value: "morning", label: "בוקר" },
  { value: "afternoon", label: "צהריים" },
  { value: "evening", label: "ערב" },
];

const TEAM_COLORS: Record<number, string> = {
  14: "border-red-400 bg-red-50",
  15: "border-blue-400 bg-blue-50",
  16: "border-purple-400 bg-purple-50",
  17: "border-dotan-gold bg-yellow-50",
};

const TEAM_NAMES: Record<number, string> = {
  14: "צוות 14",
  15: "צוות 15",
  16: "צוות 16",
  17: "צוות 17",
};

export default function AttendancePage() {
  const { status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSession, setSelectedSession] = useState("morning");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?date=${selectedDate}&session=${selectedSession}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [selectedDate, selectedSession]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  const toggleAttendance = async (userId: string, currentPresent: boolean | null) => {
    setUpdating(userId);
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        date: selectedDate,
        session: selectedSession,
        present: currentPresent === null ? true : !currentPresent,
      }),
    });
    await fetchData();
    setUpdating(null);
  };

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  const teams = [14, 15, 16, 17];
  const teamStats = teams.map((team) => {
    const teamUsers = users.filter((u) => u.team === team);
    const present = teamUsers.filter((u) => u.attendance?.present).length;
    return { team, total: teamUsers.length, present };
  });

  const totalPresent = users.filter((u) => u.attendance?.present).length;

  return (
    <div>
      <h1 className="text-3xl font-bold text-dotan-green-dark mb-6">מצל - נוכחות</h1>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-6 flex flex-wrap gap-4 items-center">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none" />
        <div className="flex gap-2">
          {SESSIONS.map(({ value, label }) => (
            <button key={value} onClick={() => setSelectedSession(value)}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                selectedSession === value ? "bg-dotan-green-dark text-white" : "bg-dotan-mint-light text-gray-700 hover:bg-dotan-mint"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint text-center">
          <div className="text-2xl font-bold text-dotan-green-dark">{totalPresent}/{users.length}</div>
          <div className="text-xs text-gray-500">סה&quot;כ</div>
        </div>
        {teamStats.map(({ team, total, present }) => (
          <div key={team} className={`p-4 rounded-xl shadow-sm border-2 text-center ${TEAM_COLORS[team]}`}>
            <div className="text-2xl font-bold">{present}/{total}</div>
            <div className="text-xs text-gray-600">{TEAM_NAMES[team]}</div>
          </div>
        ))}
      </div>

      {/* Teams */}
      {teams.map((team) => {
        const teamUsers = users.filter((u) => u.team === team);
        if (teamUsers.length === 0) return null;

        return (
          <div key={team} className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MdGroup className="text-dotan-green" />
              {TEAM_NAMES[team]}
              <span className="text-sm font-normal text-gray-500">
                ({teamUsers.filter((u) => u.attendance?.present).length}/{teamUsers.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {teamUsers.map((user) => {
                const isPresent = user.attendance?.present ?? null;
                const isUpdating = updating === user.id;

                return (
                  <button key={user.id} onClick={() => toggleAttendance(user.id, isPresent)}
                    disabled={isUpdating}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-right ${
                      isPresent === true ? "bg-dotan-mint-light border-dotan-green"
                      : isPresent === false ? "bg-red-50 border-red-300"
                      : "bg-white border-gray-200 hover:border-gray-300"
                    } ${isUpdating ? "opacity-50" : ""}`}>
                    <Avatar name={user.name} image={user.image} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{user.name}</div>
                      {user.roomNumber && <div className="text-xs text-gray-500">חדר {user.roomNumber}</div>}
                    </div>
                    <div className="text-xl">
                      {isPresent === true ? <MdCheckCircle className="text-dotan-green" />
                      : isPresent === false ? <MdCancel className="text-red-500" />
                      : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
