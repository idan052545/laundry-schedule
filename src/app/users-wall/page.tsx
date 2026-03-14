"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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

interface UserProfile {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
  roomNumber: string | null;
  phone: string | null;
  birthDate: string | null;
  role: string;
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

const TEAM_NAMES: Record<number, string> = {
  14: "צוות 14",
  15: "צוות 15",
  16: "צוות 16",
  17: "צוות 17",
};

const LEADERSHIP = [
  { name: "מאי צימרמן", role: "קהדית פלוגתית", color: "bg-dotan-gold text-dotan-green-dark" },
  { name: "טל הנגבי", role: "קצינת מבצעים פלוגתית", color: "bg-dotan-green-dark text-white" },
  { name: "נועה בלפור", role: "קאגית פלוגתית", color: "bg-dotan-green text-white" },
  { name: "נעמה", role: 'קא"רית פלוגתית', color: "bg-blue-600 text-white" },
  { name: "אוהד אבדי", role: 'סמ"פ', color: "bg-red-600 text-white" },
  { name: "תמר נגר", role: "קצינת אימונים", color: "bg-purple-600 text-white" },
  { name: "אייל מוזר", role: 'קב"ט', color: "bg-orange-600 text-white" },
  { name: "יניב גופמן", role: "קלפ חזק", color: "bg-teal-600 text-white" },
];

export default function UsersWallPage() {
  const { status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users-wall?team=${teamFilter}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [teamFilter]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchUsers();
  }, [status, router, fetchUsers]);

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.roomNumber?.includes(searchQuery) ||
    u.phone?.includes(searchQuery)
  );

  const teams = [14, 15, 16, 17];
  const teamStats = teams.map((team) => ({
    team,
    count: users.filter((u) => u.team === team).length,
  }));

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-4 sm:mb-6 flex items-center gap-3">
        <MdPeople className="text-dotan-green" />
        חיילי הפלוגה
      </h1>

      {/* Leadership */}
      <div className="bg-white rounded-xl shadow-sm border border-dotan-mint p-3 sm:p-4 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-dotan-green-dark mb-3 flex items-center gap-2">
          <MdGroup className="text-dotan-gold" /> מפקדי הפלוגה
        </h2>
        <div className="flex flex-wrap gap-2">
          {LEADERSHIP.map((leader) => (
            <div key={leader.name} className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium ${leader.color}`}>
              <span className="font-bold">{leader.name}</span>
              <span className="opacity-80 mr-1">| {leader.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button onClick={() => setTeamFilter("all")}
          className={`p-3 sm:p-4 rounded-xl shadow-sm border-2 text-center transition ${
            teamFilter === "all" ? "border-dotan-green bg-dotan-mint-light" : "border-gray-200 bg-white hover:border-dotan-mint"
          }`}>
          <div className="text-xl sm:text-2xl font-bold text-dotan-green-dark">{users.length}</div>
          <div className="text-xs text-gray-500">כל הפלוגה</div>
        </button>
        {teamStats.map(({ team, count }) => {
          const colors = TEAM_COLORS[team] || { border: "border-gray-300", bg: "bg-gray-50", text: "text-gray-700" };
          return (
            <button key={team} onClick={() => setTeamFilter(team.toString())}
              className={`p-3 sm:p-4 rounded-xl shadow-sm border-2 text-center transition ${
                teamFilter === team.toString() ? `${colors.border} ${colors.bg}` : "border-gray-200 bg-white hover:border-gray-300"
              }`}>
              <div className="text-xl sm:text-2xl font-bold">{count}</div>
              <div className={`text-xs ${colors.text}`}>{TEAM_NAMES[team]}</div>
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
          placeholder="חיפוש לפי שם, חדר או טלפון..."
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
              className={`text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border-2 transition hover:shadow-md ${
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
                        {TEAM_NAMES[user.team]}
                      </span>
                    )}
                    {user.roomNumber && (
                      <span className="flex items-center gap-0.5"><MdMeetingRoom className="text-xs" /> חדר {user.roomNumber}</span>
                    )}
                  </div>
                </div>
                {user.role === "admin" && (
                  <span className="text-[10px] bg-dotan-gold text-dotan-green-dark px-1.5 py-0.5 rounded font-bold shrink-0">מנהל</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdSearch className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>לא נמצאו תוצאות</p>
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
                    {TEAM_NAMES[selectedUser.team]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Avatar name={selectedUser.name} image={selectedUser.image} size="lg" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selectedUser.name}</h2>
                  {selectedUser.role === "admin" && (
                    <span className="text-xs bg-dotan-gold text-dotan-green-dark px-2 py-0.5 rounded-full font-bold mt-1 inline-block">מנהל מערכת</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {selectedUser.roomNumber && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdMeetingRoom className="text-dotan-green text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">חדר</div>
                    <div className="font-medium">{selectedUser.roomNumber}</div>
                  </div>
                </div>
              )}

              {selectedUser.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdPhone className="text-dotan-green text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">טלפון</div>
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
                    <div className="text-xs text-gray-500">תאריך לידה</div>
                    <div className="font-medium">{selectedUser.birthDate}</div>
                  </div>
                </div>
              )}

              {selectedUser.foodPreference && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdRestaurant className="text-orange-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">העדפות אוכל</div>
                    <div className="font-medium">{selectedUser.foodPreference}</div>
                  </div>
                </div>
              )}

              {selectedUser.allergies && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdMedicalServices className="text-red-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">אלרגיות</div>
                    <div className="font-medium">{selectedUser.allergies}</div>
                  </div>
                </div>
              )}

              {selectedUser.medicalExemptions && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdMedicalServices className="text-amber-500 text-xl shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">פטורים רפואיים</div>
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
