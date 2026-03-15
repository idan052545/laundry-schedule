"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MdCheckCircle, MdCancel, MdGroup, MdAdd, MdDelete, MdLock, MdFactCheck } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";

interface UserWithAttendance {
  id: string;
  name: string;
  team: number | null;
  image: string | null;
  roomNumber: string | null;
  attendance: { id: string; present: boolean } | null;
}

interface AttSession {
  id: string;
  name: string;
  date: string;
}

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithAttendance[]>([]);
  const [sessions, setSessions] = useState<AttSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSession, setSelectedSession] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoaded(false);
    const res = await fetch(`/api/attendance-sessions?date=${selectedDate}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
      if (data.length > 0) {
        setSelectedSession((prev) => prev || data[data.length - 1].name);
      } else {
        // No sessions for this date — stop loading
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    setSessionsLoaded(true);
  }, [selectedDate]);

  const fetchData = useCallback(async () => {
    if (!selectedSession) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`/api/attendance?date=${selectedDate}&session=${selectedSession}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [selectedDate, selectedSession]);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/user");
    if (res.ok) {
      const data = await res.json();
      // Use the user API which now returns role info
      setIsAuthorized(data.name === "אוהד אבדי" || data.role === "admin");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") { fetchSessions(); checkAuth(); }
  }, [status, router, fetchSessions, checkAuth]);

  useEffect(() => {
    if (selectedSession) fetchData();
  }, [selectedSession, fetchData]);

  const createSession = async () => {
    if (!newSessionName.trim()) return;
    const res = await fetch("/api/attendance-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSessionName.trim(), date: selectedDate }),
    });
    if (res.ok) {
      setSelectedSession(newSessionName.trim());
      setNewSessionName("");
      setShowNewSession(false);
      await fetchSessions();
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
  };

  const deleteSession = async (sess: AttSession) => {
    if (!confirm(`למחוק מצל "${sess.name}"?`)) return;
    await fetch(`/api/attendance-sessions?id=${sess.id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== sess.id));
    if (selectedSession === sess.name) {
      setSelectedSession(sessions.length > 1 ? sessions[0].name : "");
    }
  };

  const toggleAttendance = async (uid: string, currentPresent: boolean | null) => {
    if (!isAuthorized) return;
    const newPresent = currentPresent === null ? true : !currentPresent;

    // Optimistic update
    setUsers((prev) => prev.map((u) =>
      u.id === uid ? { ...u, attendance: { id: u.attendance?.id || "temp", present: newPresent } } : u
    ));
    setUpdating(uid);

    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid,
        date: selectedDate,
        session: selectedSession,
        present: newPresent,
      }),
    });
    setUpdating(null);
  };

  // Show loading only during initial load
  if (status === "loading" || (loading && !sessionsLoaded)) {
    return <InlineLoading />;
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
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-4 sm:mb-6 flex items-center gap-3">
        <MdFactCheck className="text-dotan-green" />
        מצל - נוכחות
      </h1>

      {/* Controls */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 sm:mb-6 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSession(""); setSessions([]); setUsers([]); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none text-sm" />

          {isAuthorized && (
            <button onClick={() => setShowNewSession(!showNewSession)}
              className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition text-sm font-medium flex items-center gap-1">
              <MdAdd /> פתח מצל חדש
            </button>
          )}
        </div>

        {showNewSession && isAuthorized && (
          <div className="flex gap-2 items-center">
            <input type="text" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="שם המצל (למשל: מסדר בוקר, שיעור 3...)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-dotan-green" />
            <button onClick={createSession}
              className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-dotan-green transition">צור</button>
          </div>
        )}

        {/* Session tabs */}
        {sessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sessions.map((sess) => (
              <div key={sess.id} className="flex items-center">
                <button onClick={() => setSelectedSession(sess.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedSession === sess.name ? "bg-dotan-green-dark text-white" : "bg-dotan-mint-light text-gray-700 hover:bg-dotan-mint"
                  }`}>
                  {sess.name}
                </button>
                {isAuthorized && (
                  <button onClick={() => deleteSession(sess)} className="text-red-400 hover:text-red-600 mr-0.5 text-xs"><MdDelete /></button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isAuthorized && sessionsLoaded && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MdLock /> רק אוהד אבדי יכול לפתוח ולנהל מצלים
          </div>
        )}
      </div>

      {/* Loading attendance data for selected session */}
      {loading && sessionsLoaded && selectedSession && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">טוען נתוני נוכחות...</div>
        </div>
      )}

      {sessionsLoaded && sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdGroup className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין מצלים ליום זה</p>
          {isAuthorized && <p className="text-sm mt-2">לחץ &quot;פתח מצל חדש&quot; כדי להתחיל</p>}
        </div>
      )}

      {!loading && selectedSession && sessions.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-dotan-mint text-center">
              <div className="text-xl sm:text-2xl font-bold text-dotan-green-dark">{totalPresent}/{users.length}</div>
              <div className="text-xs text-gray-500">סה&quot;כ</div>
            </div>
            {teamStats.map(({ team, total, present }) => (
              <div key={team} className={`p-3 sm:p-4 rounded-xl shadow-sm border-2 text-center ${TEAM_COLORS[team]}`}>
                <div className="text-xl sm:text-2xl font-bold">{present}/{total}</div>
                <div className="text-xs text-gray-600">{TEAM_NAMES[team]}</div>
              </div>
            ))}
          </div>

          {/* Teams */}
          {teams.map((team) => {
            const teamUsers = users.filter((u) => u.team === team);
            if (teamUsers.length === 0) return null;

            return (
              <div key={team} className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
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
                        disabled={isUpdating || !isAuthorized}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-right ${
                          isPresent === true ? "bg-dotan-mint-light border-dotan-green"
                          : isPresent === false ? "bg-red-50 border-red-300"
                          : "bg-white border-gray-200 hover:border-gray-300"
                        } ${isUpdating ? "opacity-50" : ""} ${!isAuthorized ? "cursor-default" : ""}`}>
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
        </>
      )}
    </div>
  );
}
