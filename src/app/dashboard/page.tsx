"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { MdLocalLaundryService, MdDry, MdCheckCircle, MdCancel, MdBuild, MdPerson, MdMessage, MdFactCheck, MdCake, MdCalendarMonth, MdAssignment, MdPeople, MdStar } from "react-icons/md";

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
    if (res.ok) setMachines(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchMachines();
  }, [status, router, fetchMachines]);

  const isMachineAvailable = (machine: Machine) => {
    if (machine.status === "maintenance") return false;
    return !machine.bookings.find((b) => b.date === today && b.timeSlot === currentSlot);
  };

  const getCurrentUser = (machine: Machine) => {
    return machine.bookings.find((b) => b.date === today && b.timeSlot === currentSlot)?.user;
  };

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  const features = [
    { href: "/schedule", icon: MdCalendarMonth, title: "מכבסה", desc: "קבע תור לכביסה או מייבש", color: "text-dotan-green" },
    { href: "/messages", icon: MdMessage, title: "לוח הודעות", desc: "הודעות והתראות לפלוגה", color: "text-blue-600" },
    { href: "/attendance", icon: MdFactCheck, title: "מצל", desc: "נוכחות לפי צוותים", color: "text-orange-600" },
    { href: "/birthdays", icon: MdCake, title: "ימי הולדת", desc: "קיר ימי הולדת של הפלוגה", color: "text-pink-600" },
    { href: "/tasks", icon: MdAssignment, title: "לוח משימות", desc: "משימות, דדליינים ותזכורות", color: "text-purple-600" },
    { href: "/commander", icon: MdStar, title: "לוח מפקדים", desc: "הודעות ומשימות מהמפקדים", color: "text-amber-600" },
    { href: "/users-wall", icon: MdPeople, title: "חיילי הפלוגה", desc: "מידע על כל חיילי הפלוגה", color: "text-teal-600" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full shadow overflow-hidden shrink-0">
          <Image src="/dotanLogo.png" alt="דותן" width={56} height={56} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-dotan-green-dark">
            שלום, {session?.user?.name}!
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {features.map(({ href, icon: Icon, title, desc, color }) => (
          <Link key={href} href={href} className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-dotan-mint hover:shadow-md transition group">
            <Icon className={`text-2xl sm:text-3xl ${color} mb-2 sm:mb-3 group-hover:scale-110 transition`} />
            <h3 className="font-bold text-gray-800 mb-0.5 sm:mb-1 text-sm sm:text-base">{title}</h3>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Machine Status */}
      <h2 className="text-xl font-bold text-dotan-green-dark mb-4">סטטוס מכונות</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {machines.map((machine) => {
          const available = isMachineAvailable(machine);
          const currentUser = getCurrentUser(machine);
          const isWasher = machine.type === "washer";

          return (
            <div key={machine.id} className={`p-5 rounded-xl border-2 transition ${
              machine.status === "maintenance" ? "bg-yellow-50 border-yellow-300"
              : available ? "bg-dotan-mint-light border-dotan-green"
              : "bg-red-50 border-red-300"
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800">{machine.name}</h3>
                  <div className={`text-sm font-medium mt-1 flex items-center gap-1 ${
                    machine.status === "maintenance" ? "text-yellow-600" : available ? "text-dotan-green" : "text-red-600"
                  }`}>
                    {machine.status === "maintenance" ? <><MdBuild /> בתחזוקה</>
                    : available ? <><MdCheckCircle /> {isWasher ? "פנויה" : "פנוי"}</>
                    : <><MdCancel /> {isWasher ? "תפוסה" : "תפוס"}</>}
                  </div>
                  {currentUser && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MdPerson /> {currentUser.name}
                    </div>
                  )}
                </div>
                <div className={`text-3xl ${available ? "text-dotan-green" : "text-red-400"}`}>
                  {isWasher ? <MdLocalLaundryService /> : <MdDry />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer logos */}
      <div className="mt-8 pt-6 border-t border-dotan-mint flex items-center justify-center gap-8 opacity-50">
        <Image src="/bahad1Logo.png" alt="בהד 1" width={36} height={36} className="rounded-full bg-white p-0.5" />
        <Image src="/erezLogo.png" alt="ארז" width={36} height={36} className="rounded-full bg-white p-0.5" />
      </div>
    </div>
  );
}
