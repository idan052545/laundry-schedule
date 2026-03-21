"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdNotifications, MdSend, MdGroup, MdPeople, MdPerson,
  MdCheckCircle, MdClose, MdExpandMore, MdExpandLess,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface UserOption {
  id: string;
  name: string;
  nameEn?: string | null;
  image: string | null;
  team: number | null;
}

interface PushStats {
  totalSubscriptions: number;
  uniqueUsers: number;
  teamStats: Record<string, number>;
}

type SendTarget = "all" | "team" | "users";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<PushStats | null>(null);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<SendTarget>("all");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number; total: number } | null>(null);

  const fetchData = useCallback(async () => {
    // Check auth and get stats
    const [statsRes, usersRes] = await Promise.all([
      fetch("/api/push/send"),
      fetch("/api/users-birthdays"),
    ]);

    if (statsRes.ok) {
      setAuthorized(true);
      setStats(await statsRes.json());
    } else {
      setAuthorized(false);
    }

    if (usersRes.ok) {
      const data = await usersRes.json();
      setAllUsers(data.map((u: UserOption) => ({ id: u.id, name: u.name, nameEn: u.nameEn, image: u.image, team: u.team })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const payload: Record<string, unknown> = { title, body };
    if (url) payload.url = url;
    if (target === "team" && selectedTeam) payload.team = selectedTeam;
    if (target === "users" && selectedUsers.length > 0) payload.userIds = selectedUsers;

    setSending(true);
    setResult(null);

    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    } else {
      const err = await res.json();
      alert(err.error || t.common.error);
    }
    setSending(false);
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const filteredUsers = allUsers.filter((u) => {
    const dn = displayName(u, locale);
    return dn.toLowerCase().includes(userSearch.toLowerCase()) || u.name.includes(userSearch);
  });

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  if (!authorized) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MdNotifications className="text-5xl mx-auto mb-4 text-gray-300" />
        <p>{t.notifications.noPermission}</p>
        <p className="text-sm mt-2">{t.notifications.onlyAdmins}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-6 flex items-center gap-3">
        <MdNotifications className="text-dotan-green" />
        {t.notifications.title}
      </h1>

      {/* Stats */}
      {stats && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{t.notifications.subscriberStats}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-dotan-mint-light p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-dotan-green-dark">{stats.uniqueUsers}</div>
              <div className="text-xs text-gray-500">{t.notifications.registeredUsers}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700">{stats.totalSubscriptions}</div>
              <div className="text-xs text-gray-500">{t.notifications.registeredDevices}</div>
            </div>
            {Object.entries(stats.teamStats).map(([team, count]) => (
              <div key={team} className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-700">{count}</div>
                <div className="text-xs text-gray-500">{team}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send form */}
      <form onSubmit={handleSend} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint space-y-4">
        <h2 className="text-base font-bold text-gray-800">{t.notifications.sendNotification}</h2>

        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
          placeholder={t.notifications.notifTitle} required />

        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm min-h-[80px]"
          placeholder={t.notifications.notifContent} required />

        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
          placeholder={t.notifications.linkOptional} dir="ltr" />

        {/* Target selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.notifications.sendTo}</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTarget("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                target === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <MdPeople /> {t.teams.allPlatoon}
            </button>
            <button type="button" onClick={() => setTarget("team")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                target === "team" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <MdGroup /> {t.common.team}
            </button>
            <button type="button" onClick={() => setTarget("users")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                target === "users" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <MdPerson /> {t.notifications.specificSoldiers}
            </button>
          </div>
        </div>

        {/* Team selector */}
        {target === "team" && (
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none text-sm" required>
            <option value="">{t.notifications.selectTeam}</option>
            <option value="14">{t.teams.team14}</option>
            <option value="15">{t.teams.team15}</option>
            <option value="16">{t.teams.team16}</option>
            <option value="17">{t.teams.team17}</option>
          </select>
        )}

        {/* User picker */}
        {target === "users" && (
          <div>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUsers.map((uid) => {
                  const u = allUsers.find((x) => x.id === uid);
                  return u ? (
                    <span key={uid} className="text-xs bg-dotan-mint-light text-dotan-green-dark px-2 py-1 rounded-full flex items-center gap-1">
                      {displayName(u, locale)}
                      <button type="button" onClick={() => toggleUser(uid)} className="hover:text-red-500"><MdClose /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <button type="button" onClick={() => setShowUserPicker(!showUserPicker)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition">
              {showUserPicker ? <MdExpandLess /> : <MdExpandMore />}
              {t.notifications.selectSoldiers} ({selectedUsers.length} {t.notifications.selected})
            </button>

            {showUserPicker && (
              <div className="mt-2 border border-gray-200 rounded-lg p-3 max-h-[250px] overflow-y-auto bg-gray-50">
                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t.common.search} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg mb-2 text-sm outline-none" />
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={`w-full text-start flex items-center gap-2 p-1.5 rounded text-sm transition ${
                        selectedUsers.includes(u.id) ? "bg-dotan-mint-light" : "hover:bg-gray-100"
                      }`}>
                      <Avatar name={u.name} image={u.image} size="xs" />
                      <span className="flex-1">{displayName(u, locale)}</span>
                      {u.team && <span className="text-xs text-gray-400">{t.common.team} {u.team}</span>}
                      {selectedUsers.includes(u.id) && <MdCheckCircle className="text-dotan-green text-sm" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`p-3 rounded-lg text-sm ${
            result.total === 0 ? "bg-amber-50 text-amber-700 border border-amber-200"
            : result.failed === 0 ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {result.total === 0 ? (
              t.notifications.noDevices
            ) : (
              <>{t.notifications.sentSuccess}{result.succeeded} {t.notifications.devices}{result.failed > 0 && ` (${result.failed} ${t.notifications.failed})`}</>
            )}
          </div>
        )}

        <button type="submit" disabled={sending || (target === "team" && !selectedTeam) || (target === "users" && selectedUsers.length === 0)}
          className="w-full bg-dotan-green-dark text-white py-3 rounded-lg hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base">
          <MdSend /> {sending ? t.common.sending : t.notifications.sendBtn}
        </button>
      </form>
    </div>
  );
}
