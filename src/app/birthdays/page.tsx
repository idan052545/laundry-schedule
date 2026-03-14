"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MdCake } from "react-icons/md";
import Avatar from "@/components/Avatar";

interface UserBirthday {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
  roomNumber: string | null;
  birthDate: string | null;
}

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function parseBirthDate(dateStr: string): { day: number; month: number; year: number } | null {
  const parts = dateStr.split(".");
  if (parts.length < 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return { day, month, year: year < 100 ? 2000 + year : year };
}

function isBirthdayToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const parsed = parseBirthDate(dateStr);
  if (!parsed) return false;
  const today = new Date();
  return parsed.day === today.getDate() && parsed.month === today.getMonth() + 1;
}

function isBirthdayThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const parsed = parseBirthDate(dateStr);
  if (!parsed) return false;
  const today = new Date();
  const thisYear = today.getFullYear();
  const bday = new Date(thisYear, parsed.month - 1, parsed.day);
  const diff = bday.getTime() - today.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
}

export default function BirthdaysPage() {
  const { status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/attendance?date=none&session=none");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.map((u: UserBirthday & { attendance?: unknown }) => ({
        id: u.id, name: u.name, image: u.image, team: u.team, roomNumber: u.roomNumber,
        birthDate: null,
      })));
    }
    // Fetch full user data with birthDate
    const usersRes = await fetch("/api/users-birthdays");
    if (usersRes.ok) setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchUsers();
  }, [status, router, fetchUsers]);

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  // Group by month
  const byMonth: Record<number, UserBirthday[]> = {};
  users.forEach((user) => {
    if (!user.birthDate) return;
    const parsed = parseBirthDate(user.birthDate);
    if (!parsed) return;
    if (!byMonth[parsed.month]) byMonth[parsed.month] = [];
    byMonth[parsed.month].push(user);
  });

  // Sort each month by day
  Object.values(byMonth).forEach((arr) => {
    arr.sort((a, b) => {
      const pa = parseBirthDate(a.birthDate!);
      const pb = parseBirthDate(b.birthDate!);
      return (pa?.day || 0) - (pb?.day || 0);
    });
  });

  // Today's birthdays
  const todayBirthdays = users.filter((u) => isBirthdayToday(u.birthDate));
  const weekBirthdays = users.filter((u) => isBirthdayThisWeek(u.birthDate) && !isBirthdayToday(u.birthDate));

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div>
      <h1 className="text-3xl font-bold text-dotan-green-dark mb-6 flex items-center gap-3">
        <MdCake className="text-pink-500" />
        ימי הולדת - פלוגת דותן
      </h1>

      {/* Today */}
      {todayBirthdays.length > 0 && (
        <div className="bg-gradient-to-l from-pink-100 to-dotan-mint-light p-6 rounded-xl border-2 border-pink-300 mb-6">
          <h2 className="text-xl font-bold text-pink-600 mb-4 flex items-center gap-2">
            <MdCake /> יום הולדת היום!
          </h2>
          <div className="flex flex-wrap gap-4">
            {todayBirthdays.map((user) => (
              <div key={user.id} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow">
                <Avatar name={user.name} image={user.image} size="md" />
                <div>
                  <div className="font-bold text-gray-800">{user.name}</div>
                  <div className="text-xs text-gray-500">צוות {user.team}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* This week */}
      {weekBirthdays.length > 0 && (
        <div className="bg-dotan-mint-light p-5 rounded-xl border border-dotan-mint mb-6">
          <h2 className="text-lg font-bold text-dotan-green-dark mb-3">ימי הולדת השבוע הקרוב</h2>
          <div className="flex flex-wrap gap-3">
            {weekBirthdays.map((user) => {
              const parsed = parseBirthDate(user.birthDate!);
              return (
                <div key={user.id} className="flex items-center gap-2 bg-white p-2 px-3 rounded-lg border border-dotan-mint">
                  <Avatar name={user.name} image={user.image} size="sm" />
                  <span className="font-medium text-sm">{user.name}</span>
                  <span className="text-xs text-gray-500">{parsed?.day}/{parsed?.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All months */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const monthUsers = byMonth[month] || [];
          if (monthUsers.length === 0) return null;

          return (
            <div key={month} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
              month === currentMonth ? "border-dotan-gold border-2" : "border-dotan-mint"
            }`}>
              <div className={`px-4 py-2 font-bold ${
                month === currentMonth ? "bg-dotan-gold text-dotan-green-dark" : "bg-dotan-mint-light text-dotan-green-dark"
              }`}>
                {MONTHS_HE[month - 1]}
              </div>
              <div className="p-3 space-y-2">
                {monthUsers.map((user) => {
                  const parsed = parseBirthDate(user.birthDate!);
                  const isToday = isBirthdayToday(user.birthDate);
                  return (
                    <div key={user.id} className={`flex items-center gap-2 p-2 rounded-lg ${isToday ? "bg-pink-50 border border-pink-200" : ""}`}>
                      <Avatar name={user.name} image={user.image} size="sm" />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-gray-400 mr-2">צוות {user.team}</span>
                      </div>
                      <span className="text-sm text-gray-500 font-mono">{parsed?.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
