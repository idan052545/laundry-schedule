"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { InlineLoading } from "@/components/LoadingScreen";
import {
  MdPeople,
  MdGroup,
  MdPhone,
  MdCake,
  MdRestaurant,
  MdMedicalServices,
  MdSearch,
  MdClose,
  MdMeetingRoom,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";

interface UserProfile {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
  roomNumber: string | null;
  phone: string | null;
  birthDate: string | null;
  role: string;
  roleTitle: string | null;
  foodPreference: string | null;
  allergies: string | null;
  medicalExemptions: string | null;
}

const TEAM_COLORS: Record<number, { border: string; bg: string; text: string }> = {
  14: { border: "border-red-400", bg: "bg-red-50", text: "text-red-700" },
  15: { border: "border-blue-400", bg: "bg-blue-50", text: "text-blue-700" },
  16: { border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-700" },
  17: { border: "border-dotan-gold", bg: "bg-yellow-50", text: "text-yellow-700" },
};

const LEADER_COLORS = [
  "bg-dotan-gold text-dotan-green-dark",
  "bg-dotan-green-dark text-white",
  "bg-dotan-green text-white",
  "bg-blue-600 text-white",
  "bg-red-600 text-white",
  "bg-purple-600 text-white",
  "bg-orange-600 text-white",
  "bg-teal-600 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-600 text-white",
];

export default function UsersWallPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const teamNames: Record<number, string> = {
    14: t.teams.team14,
    15: t.teams.team15,
    16: t.teams.team16,
    17: t.teams.team17,
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users-wall?team=all");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchUsers();
  }, [status, router, fetchUsers]);

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  const EXCLUDED_ROLES = ["sagal", "simulator", "simulator-admin"];
  const soldiers = users.filter((u) => !EXCLUDED_ROLES.includes(u.role));

  const filteredUsers = soldiers.filter((u) => {
    const matchesTeam = teamFilter === "all" || u.team === parseInt(teamFilter);
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.roomNumber?.includes(searchQuery) ||
      u.phone?.includes(searchQuery);
    return matchesTeam && matchesSearch;
  });

  const teams = [14, 15, 16, 17];
  const teamStats = teams.map((team) => ({
    team,
    count: soldiers.filter((u) => u.team === team).length,
  }));

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-4 sm:mb-6 flex items-center gap-3">
        <MdPeople className="text-dotan-green" />
        {t.usersWall.title}
      </h1>

      {/* Leadership */}
      {(() => {
        const leaders = users.filter((u) => u.role === "commander" || (u.roleTitle && u.role !== "user"));
        if (leaders.length === 0) return null;
        return (
          <div className="bg-white rounded-xl shadow-sm border border-dotan-mint p-3 sm:p-4 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-dotan-green-dark mb-3 flex items-center gap-2">
              <MdGroup className="text-dotan-gold" /> {t.usersWall.commandersTitle}
            </h2>
            <div className="flex flex-wrap gap-2">
              {leaders.map((leader, i) => (
                <div key={leader.id} className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium ${LEADER_COLORS[i % LEADER_COLORS.length]}`}>
                  <span className="font-bold">{leader.name}</span>
                  {leader.roleTitle && <span className="opacity-80 me-1">| {leader.roleTitle}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button onClick={() => setTeamFilter("all")}
          className={`p-3 sm:p-4 rounded-xl shadow-sm border-2 text-center transition ${
            teamFilter === "all" ? "border-dotan-green bg-dotan-mint-light" : "border-gray-200 bg-white hover:border-dotan-mint"
          }`}>
          <div className="text-xl sm:text-2xl font-bold text-dotan-green-dark">{soldiers.length}</div>
          <div className="text-xs text-gray-500">{t.teams.allPlatoon}</div>
        </button>
        {teamStats.map(({ team, count }) => {
          const colors = TEAM_COLORS[team] || { border: "border-gray-300", bg: "bg-gray-50", text: "text-gray-700" };
          return (
            <button key={team} onClick={() => setTeamFilter(team.toString())}
              className={`p-3 sm:p-4 rounded-xl shadow-sm border-2 text-center transition ${
                teamFilter === team.toString() ? `${colors.border} ${colors.bg}` : "border-gray-200 bg-white hover:border-gray-300"
              }`}>
              <div className="text-xl sm:text-2xl font-bold">{count}</div>
              <div className={`text-xs ${colors.text}`}>{teamNames[team]}</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4 sm:mb-6">
        <MdSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.usersWall.searchPlaceholder}
          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm sm:text-base"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <MdClose />
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredUsers.map((user) => {
          const teamColor = user.team ? TEAM_COLORS[user.team] : null;
          return (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`text-start bg-white p-3 sm:p-4 rounded-xl shadow-sm border-2 transition hover:shadow-md ${
                teamColor ? `${teamColor.border} hover:${teamColor.bg}` : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={user.name} image={user.image} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-sm sm:text-base truncate">{user.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {user.team && (
                      <span className={`px-1.5 py-0.5 rounded ${teamColor?.bg} ${teamColor?.text} font-medium`}>
                        {teamNames[user.team]}
                      </span>
                    )}
                    {user.roomNumber && (
                      <span className="flex items-center gap-0.5"><MdMeetingRoom className="text-xs" /> {t.common.room} {user.roomNumber}</span>
                    )}
                  </div>
                </div>
                {user.role === "admin" && (
                  <span className="text-[10px] bg-dotan-gold text-dotan-green-dark px-1.5 py-0.5 rounded font-bold shrink-0">{t.profile.admin}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdSearch className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>{t.common.noResults}</p>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className={`p-5 sm:p-6 rounded-t-2xl ${selectedUser.team ? TEAM_COLORS[selectedUser.team]?.bg : "bg-dotan-mint-light"}`}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-700 transition">
                  <MdClose className="text-xl" />
                </button>
                {selectedUser.team && (
                  <span className={`text-sm font-bold ${TEAM_COLORS[selectedUser.team]?.text}`}>
                    {teamNames[selectedUser.team]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Avatar name={selectedUser.name} image={selectedUser.image} size="lg" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedUser.name}</h2>
                  {selectedUser.role === "admin" && (
                    <span className="text-xs bg-dotan-gold text-dotan-green-dark px-2 py-0.5 rounded-full font-bold mt-1 inline-block">{t.profile.sysAdmin}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {selectedUser.roomNumber && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdMeetingRoom className="text-dotan-green text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">{t.common.room}</div>
                    <div className="font-medium">{selectedUser.roomNumber}</div>
                  </div>
                </div>
              )}

              {selectedUser.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdPhone className="text-dotan-green text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">{t.common.phone}</div>
                    <a href={`tel:${selectedUser.phone}`} className="font-medium text-dotan-green-dark hover:underline" dir="ltr">
                      {selectedUser.phone}
                    </a>
                  </div>
                </div>
              )}

              {selectedUser.birthDate && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdCake className="text-pink-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">{t.usersWall.birthDate}</div>
                    <div className="font-medium">{selectedUser.birthDate}</div>
                  </div>
                </div>
              )}

              {selectedUser.foodPreference && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdRestaurant className="text-orange-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">{t.usersWall.foodPreference}</div>
                    <div className="font-medium">{selectedUser.foodPreference}</div>
                  </div>
                </div>
              )}

              {selectedUser.allergies && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdMedicalServices className="text-red-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">{t.usersWall.allergies}</div>
                    <div className="font-medium">{selectedUser.allergies}</div>
                  </div>
                </div>
              )}

              {selectedUser.medicalExemptions && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdMedicalServices className="text-amber-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">{t.usersWall.medicalExemptions}</div>
                    <div className="font-medium">{selectedUser.medicalExemptions}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
