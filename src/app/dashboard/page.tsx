"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
  bookings: {
    id: string;
    date: string;
    timeSlot: string;
    user: { id: string; name: string; image: string | null };
  }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();
  const currentSlot = `${currentHour.toString().padStart(2, "0")}:00`;

  const fetchMachines = useCallback(async () => {
    const res = await fetch("/api/machines");
    if (res.ok) {
      const data = await res.json();
      setMachines(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchMachines();
    }
  }, [status, router, fetchMachines]);

  const isMachineAvailable = (machine: Machine) => {
    if (machine.status === "maintenance") return false;
    const currentBooking = machine.bookings.find(
      (b) => b.date === today && b.timeSlot === currentSlot
    );
    return !currentBooking;
  };

  const getCurrentUser = (machine: Machine) => {
    const currentBooking = machine.bookings.find(
      (b) => b.date === today && b.timeSlot === currentSlot
    );
    return currentBooking?.user;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-gray-500">טוען...</div>
      </div>
    );
  }

  const washers = machines.filter((m) => m.type === "washer");
  const dryers = machines.filter((m) => m.type === "dryer");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          שלום, {session?.user?.name}! 👋
        </h1>
        <p className="text-gray-500 mt-2">
          סטטוס המכונות כרגע - {new Date().toLocaleDateString("he-IL")}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="text-3xl mb-2">🧺</div>
          <div className="text-2xl font-bold text-gray-800">
            {washers.filter(isMachineAvailable).length}/{washers.length}
          </div>
          <div className="text-gray-500">מכונות כביסה פנויות</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="text-3xl mb-2">🌀</div>
          <div className="text-2xl font-bold text-gray-800">
            {dryers.filter(isMachineAvailable).length}/{dryers.length}
          </div>
          <div className="text-gray-500">מייבשים פנויים</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="text-3xl mb-2">📅</div>
          <Link href="/schedule" className="text-blue-600 hover:underline text-lg font-medium">
            קבע תור עכשיו
          </Link>
          <div className="text-gray-500 mt-1">בחר זמן מתאים</div>
        </div>
      </div>

      {/* Washers */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">מכונות כביסה</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {washers.map((machine) => {
          const available = isMachineAvailable(machine);
          const currentUser = getCurrentUser(machine);
          return (
            <div
              key={machine.id}
              className={`p-6 rounded-xl border-2 transition ${
                machine.status === "maintenance"
                  ? "bg-yellow-50 border-yellow-300"
                  : available
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{machine.name}</h3>
                  <div
                    className={`text-sm font-medium mt-1 ${
                      machine.status === "maintenance"
                        ? "text-yellow-600"
                        : available
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {machine.status === "maintenance"
                      ? "בתחזוקה"
                      : available
                      ? "פנויה ✓"
                      : "תפוסה ✗"}
                  </div>
                </div>
                <div className="text-4xl">
                  {machine.status === "maintenance" ? "🔧" : available ? "✅" : "🔴"}
                </div>
              </div>
              {currentUser && (
                <div className="mt-3 pt-3 border-t border-red-200 text-sm text-gray-600">
                  בשימוש ע&quot;י: {currentUser.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dryers */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">מייבשים</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dryers.map((machine) => {
          const available = isMachineAvailable(machine);
          const currentUser = getCurrentUser(machine);
          return (
            <div
              key={machine.id}
              className={`p-6 rounded-xl border-2 transition ${
                machine.status === "maintenance"
                  ? "bg-yellow-50 border-yellow-300"
                  : available
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{machine.name}</h3>
                  <div
                    className={`text-sm font-medium mt-1 ${
                      machine.status === "maintenance"
                        ? "text-yellow-600"
                        : available
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {machine.status === "maintenance"
                      ? "בתחזוקה"
                      : available
                      ? "פנוי ✓"
                      : "תפוס ✗"}
                  </div>
                </div>
                <div className="text-4xl">
                  {machine.status === "maintenance" ? "🔧" : available ? "✅" : "🔴"}
                </div>
              </div>
              {currentUser && (
                <div className="mt-3 pt-3 border-t border-red-200 text-sm text-gray-600">
                  בשימוש ע&quot;י: {currentUser.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {machines.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">🏗️</div>
          <p className="text-lg">אין מכונות מוגדרות עדיין</p>
          <p className="text-sm mt-2">פנה למנהל המערכת</p>
        </div>
      )}
    </div>
  );
}
