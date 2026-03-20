"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdNewspaper, MdSend, MdDelete, MdCheckCircle, MdAccessTime,
  MdMeetingRoom, MdWarning,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";

interface AktualiaEntry {
  id: string;
  roomNumber: string;
  subject: string;
  date: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; roomNumber: string | null };
}

export default function AktualiaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<AktualiaEntry[]>([]);
  const [allRooms, setAllRooms] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const userId = session?.user ? (session.user as { id: string }).id : null;
  const myRole = (session?.user as { role?: string } | undefined)?.role;
  const isSagal = myRole === "sagal";
  const [userRoom, setUserRoom] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [aktRes, userRes] = await Promise.all([
      fetch("/api/aktualia"),
      fetch("/api/user"),
    ]);
    if (aktRes.ok) {
      const data = await aktRes.json();
      setEntries(data.entries);
      setAllRooms(data.allRooms);
      setDate(data.date);
    }
    if (userRes.ok) {
      const userData = await userRes.json();
      setUserRoom(userData.roomNumber || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  const myRoomHasEntry = entries.some((e) => e.user.roomNumber === userRoom);
  const iAlreadyChose = entries.some((e) => e.userId === userId);
  const canSubmit = !myRoomHasEntry && !iAlreadyChose && !!userRoom;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/aktualia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim() }),
    });

    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [...prev, entry].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)));
      setSubject("");
    } else {
      const err = await res.json();
      setError(err.error || "שגיאה");
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/aktualia?id=${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  const filledRooms = new Set(entries.map((e) => e.roomNumber));
  const missingRooms = allRooms.filter((r) => !filledRooms.has(r));

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  if (isSagal) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
        <MdNewspaper className="text-6xl text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-700 mb-2">אקטואליה</h1>
        <p className="text-lg text-gray-500 font-medium">חכו למסדר מחר</p>
        <p className="text-sm text-gray-400 mt-2">תוכן זה אינו זמין לסגל מפקד</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-2 flex items-center gap-3">
        <MdNewspaper className="text-dotan-green" />
        אקטואליה
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        כל חדר בוחר נושא לדיון בוקר. מתאפס בשעה 10:00.
        <span className="text-xs text-gray-400 block mt-0.5">תאריך: {new Date(date + "T12:00:00").toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
      </p>

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-sm">
          <MdCheckCircle className="text-green-500" />
          <span className="font-medium text-green-700">{entries.length}</span>
          <span className="text-gray-500">בחרו</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <MdAccessTime className="text-amber-500" />
          <span className="font-medium text-amber-700">{missingRooms.length}</span>
          <span className="text-gray-500">ממתינים</span>
        </div>
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div
            className="bg-dotan-green h-2 rounded-full transition-all"
            style={{ width: `${allRooms.length > 0 ? (entries.length / allRooms.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Submit form */}
      {canSubmit && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-6">
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <MdMeetingRoom className="text-dotan-green" />
            <span>חדר {userRoom}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setError(""); }}
              placeholder="הזן נושא לאקטואליה..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              required
            />
            <button type="submit" disabled={sending || !subject.trim()}
              className="bg-dotan-green-dark text-white px-4 py-2.5 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1.5 disabled:opacity-50 text-sm shrink-0">
              <MdSend /> {sending ? "שולח..." : "שלח"}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
              <MdWarning /> {error}
            </div>
          )}
        </form>
      )}

      {!canSubmit && !userRoom && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700 flex items-center gap-2">
          <MdWarning /> עדכן מספר חדר בפרופיל כדי לבחור נושא
        </div>
      )}

      {!canSubmit && userRoom && (myRoomHasEntry || iAlreadyChose) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700 flex items-center gap-2">
          <MdCheckCircle /> {iAlreadyChose ? "כבר בחרת נושא להיום" : "מישהו מהחדר שלך כבר בחר נושא"}
        </div>
      )}

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const isMyEntry = entry.userId === userId;
          return (
            <div key={entry.id} className={`bg-white rounded-xl border p-3 sm:p-4 transition ${
              isMyEntry ? "border-dotan-green bg-dotan-mint-light/30" : "border-gray-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dotan-green-dark text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  {entry.roomNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base">{entry.subject}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <Avatar name={entry.user.name} image={entry.user.image} size="xs" />
                    <span>{entry.user.name}</span>
                    <span>| {formatTime(entry.createdAt)}</span>
                  </div>
                </div>
                {isMyEntry && (
                  <button onClick={() => handleDelete(entry.id)}
                    className="text-red-400 hover:text-red-600 transition p-1.5 shrink-0">
                    <MdDelete />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Missing rooms */}
      {missingRooms.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
            <MdAccessTime className="text-amber-500" />
            חדרים שעדיין לא בחרו ({missingRooms.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {missingRooms.map((room) => (
              <span key={room} className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 font-medium">
                חדר {room}
              </span>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdNewspaper className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין נושאים עדיין להיום</p>
          <p className="text-sm mt-2">בחרו נושא לאקטואליה של הבוקר</p>
        </div>
      )}
    </div>
  );
}
