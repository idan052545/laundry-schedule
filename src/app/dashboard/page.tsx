"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { MdLocalLaundryService, MdDry, MdCalendarMonth, MdCheckCircle, MdCancel, MdBuild, MdPerson } from "react-icons/md";

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

  const renderMachineCard = (machine: Machine) => {
    const available = isMachineAvailable(machine);
    const currentUser = getCurrentUser(machine);
    const isWasher = machine.type === "washer";

    return (
      <div
        key={machine.id}
        className={`p-6 rounded-xl border-2 transition ${
          machine.status === "maintenance"
            ? "bg-yellow-50 border-yellow-300"
            : available
            ? "bg-dotan-mint-light border-dotan-green"
            : "bg-red-50 border-red-300"
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{machine.name}</h3>
            <div
              className={`text-sm font-medium mt-1 flex items-center gap-1 ${
                machine.status === "maintenance"
                  ? "text-yellow-600"
                  : available
                  ? "text-dotan-green"
                  : "text-red-600"
              }`}
            >
              {machine.status === "maintenance" ? (
                <><MdBuild /> בתחזוקה</>
              ) : available ? (
                <><MdCheckCircle /> {isWasher ? "פנויה" : "פנוי"}</>
              ) : (
                <><MdCancel /> {isWasher ? "תפוסה" : "תפוס"}</>
              )}
            </div>
          </div>
          <div className={`text-4xl ${
            machine.status === "maintenance"
              ? "text-yellow-500"
              : available
              ? "text-dotan-green"
              : "text-red-500"
          }`}>
            {isWasher ? <MdLocalLaundryService /> : <MdDry />}
          </div>
        </div>
        {currentUser && (
          <div className="mt-3 pt-3 border-t border-red-200 text-sm text-gray-600 flex items-center gap-1">
            <MdPerson />
            בשימוש ע&quot;י: {currentUser.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header with logos */}
      <div className="mb-8 flex items-center gap-4">
        <Image src="/dotanLogo.jpeg" alt="דותן" width={56} height={56} className="rounded-full shadow" />
        <div>
          <h1 className="text-3xl font-bold text-dotan-green-dark">
            שלום, {session?.user?.name}!
          </h1>
          <p className="text-gray-500 mt-1">
            סטטוס המכונות כרגע - {new Date().toLocaleDateString("he-IL")}
          </p>
        </div>
      </div>

      {/* Machine Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {machines.map(renderMachineCard)}
      </div>

      {/* Quick Action */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-dotan-mint text-center">
        <MdCalendarMonth className="text-4xl text-dotan-green mx-auto mb-3" />
        <Link href="/schedule" className="text-dotan-green-dark hover:text-dotan-green text-lg font-bold">
          קבע תור עכשיו
        </Link>
        <p className="text-gray-500 mt-1 text-sm">בחר זמן מתאים לכביסה או מייבש</p>
      </div>

      {machines.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdBuild className="text-5xl mx-auto mb-4 text-gray-400" />
          <p className="text-lg">אין מכונות מוגדרות עדיין</p>
          <p className="text-sm mt-2">פנה למנהל המערכת</p>
        </div>
      )}

      {/* Footer logos */}
      <div className="mt-12 pt-6 border-t border-dotan-mint flex items-center justify-center gap-8 opacity-60">
        <Image src="/bahad1Logo.png" alt="בהד 1" width={40} height={40} className="rounded-full" />
        <Image src="/erezLogo.png" alt="ארז" width={40} height={40} className="rounded-full" />
      </div>
    </div>
  );
}
