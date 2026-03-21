"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { InlineLoading } from "@/components/LoadingScreen";
import Image from "next/image";
import {
  MdLocalLaundryService, MdCalendarMonth, MdAssignment, MdPeople,
  MdMessage, MdFactCheck, MdCake, MdStar, MdDescription, MdMenuBook,
  MdFolder, MdBuild, MdPerson, MdPoll, MdAutoAwesome, MdSecurity,
  MdLocalHospital, MdNewspaper, MdNotifications, MdTune, MdRefresh,
  MdWarning, MdVolunteerActivism,
} from "react-icons/md";
import type { Machine, DashboardFeed, SectionKey, DashStyle, Notification } from "./types";
import { loadVisibleSections, getGreeting } from "./constants";
import SettingsPanel from "./SettingsPanel";
import SagalStats from "./SagalStats";
import VolunteerAlerts from "./VolunteerAlerts";
import NotificationCenter from "./NotificationCenter";
import ClassicFeed from "./ClassicFeed";
import NewFeed from "./NewFeed";
import CarouselFeed from "./CarouselFeed";
import MachineStatus from "./MachineStatus";
import { useLanguage } from "@/i18n";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, dateLocale } = useLanguage();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visible, setVisible] = useState<Set<SectionKey>>(() => loadVisibleSections());
  const [dashStyle, setDashStyle] = useState<DashStyle>(() => {
    if (typeof window === "undefined") return "new";
    return (localStorage.getItem("dashboard-style") as DashStyle) || "new";
  });
  const [sagalMode, setSagalMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sagal-mode") === "true";
  });

  const toggleSection = (key: SectionKey) => {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem("dashboard-sections", JSON.stringify([...next]));
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    const [machinesRes, feedRes, notifRes] = await Promise.all([
      fetch("/api/machines"),
      fetch("/api/dashboard"),
      fetch("/api/notifications"),
    ]);
    if (machinesRes.ok) setMachines(await machinesRes.json());
    if (feedRes.ok) setFeed(await feedRes.json());
    if (notifRes.ok) setNotifications(await notifRes.json());
    setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  // Auto-refetch every 30s for live volunteer awareness
  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [status, fetchData]);

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  const features = [
    { href: "/schedule-daily", icon: MdCalendarMonth, title: t.dashboard.dailySchedule, color: "text-sky-600", bg: "bg-sky-50" },
    { href: "/messages", icon: MdMessage, title: t.dashboard.messages, color: "text-blue-600", bg: "bg-blue-50" },
    { href: "/tasks", icon: MdAssignment, title: t.dashboard.tasks, color: "text-purple-600", bg: "bg-purple-50" },
    { href: "/forms", icon: MdDescription, title: t.dashboard.forms, color: "text-indigo-600", bg: "bg-indigo-50" },
    { href: "/attendance", icon: MdFactCheck, title: t.dashboard.attendance, color: "text-orange-600", bg: "bg-orange-50" },
    { href: "/commander", icon: MdStar, title: t.dashboard.commanders, color: "text-amber-600", bg: "bg-amber-50" },
    { href: "/surveys", icon: MdPoll, title: t.dashboard.surveys, color: "text-violet-600", bg: "bg-violet-50" },
    { href: "/person-of-week", icon: MdAutoAwesome, title: t.dashboard.personOfWeek, color: "text-yellow-600", bg: "bg-yellow-50" },
    { href: "/issues", icon: MdBuild, title: t.dashboard.issues, color: "text-red-600", bg: "bg-red-50" },
    { href: "/users-wall", icon: MdPeople, title: t.dashboard.soldiers, color: "text-teal-600", bg: "bg-teal-50" },
    { href: "/materials", icon: MdMenuBook, title: t.dashboard.materials, color: "text-rose-600", bg: "bg-rose-50" },
    { href: "/formats", icon: MdFolder, title: t.dashboard.formats, color: "text-cyan-600", bg: "bg-cyan-50" },
    { href: "/schedule", icon: MdLocalLaundryService, title: t.dashboard.laundry, color: "text-dotan-green", bg: "bg-green-50" },
    { href: "/birthdays", icon: MdCake, title: t.dashboard.birthdays, color: "text-pink-600", bg: "bg-pink-50" },
    { href: "/volunteers", icon: MdVolunteerActivism, title: t.dashboard.volunteers, color: "text-green-600", bg: "bg-green-50" },
    { href: "/guard-duty", icon: MdSecurity, title: t.dashboard.guardDuty, color: "text-amber-700", bg: "bg-amber-50" },
    { href: "/daily-quote", icon: MdAutoAwesome, title: t.dashboard.dailyQuote, color: "text-purple-600", bg: "bg-purple-50" },
    { href: "/chopal", icon: MdLocalHospital, title: t.dashboard.chopal, color: "text-rose-600", bg: "bg-rose-50" },
    { href: "/aktualia", icon: MdNewspaper, title: t.dashboard.aktualia, color: "text-emerald-600", bg: "bg-emerald-50" },
    { href: "/notifications", icon: MdNotifications, title: t.dashboard.notifications, color: "text-gray-600", bg: "bg-gray-50" },
    { href: "/profile", icon: MdPerson, title: t.dashboard.profile, color: "text-gray-500", bg: "bg-gray-50" },
  ];

  const firstName = session?.user?.name?.split(" ")[0] || "";
  const myRole = (session?.user as { role?: string } | undefined)?.role;
  const isRealAdmin = myRole === "admin";
  const isSagal = myRole === "sagal" || (isRealAdmin && sagalMode);

  // Count urgent items
  const urgentCount = (feed?.pendingForms.length || 0)
    + (feed?.todayTasks.filter(t => t.priority === "urgent" || (t.dueDate && new Date(t.dueDate) < new Date())).length || 0);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header — compact, elegant */}
      <div className="mb-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl shadow-sm overflow-hidden shrink-0 border border-dotan-mint">
          <Image src="/dotanLogo.png" alt="דותן" width={44} height={44} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {getGreeting(t)}, {firstName}
          </h1>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition ${showSettings ? "bg-dotan-green text-white" : "bg-white border border-gray-200 text-gray-400 hover:text-gray-600"}`}>
            <MdTune className="text-lg" />
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-dotan-green transition disabled:opacity-50">
            <MdRefresh className={`text-lg ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          visible={visible}
          toggleSection={toggleSection}
          dashStyle={dashStyle}
          setDashStyle={setDashStyle}
          isRealAdmin={isRealAdmin}
          sagalMode={sagalMode}
          setSagalMode={setSagalMode}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Sagal commander stats overview */}
      {isSagal && feed && <SagalStats feed={feed} />}

      {/* Urgent banner — forms + overdue tasks */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
          <MdWarning className="text-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-700 flex-1">
            {urgentCount} {t.dashboard.actionItems}
          </span>
          {(feed?.pendingForms.length || 0) > 0 && (
            <Link href="/forms" className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold hover:bg-red-200 transition">
              {feed?.pendingForms.length} {t.dashboard.forms}
            </Link>
          )}
        </div>
      )}

      {/* Volunteer alerts */}
      {visible.has("volunteers") && feed && <VolunteerAlerts feed={feed} />}

      {/* Notification center */}
      {feed && <NotificationCenter notifications={notifications} setNotifications={setNotifications} />}

      {/* Feed views */}
      {feed && dashStyle === "classic" && <ClassicFeed feed={feed} visible={visible} />}
      {feed && dashStyle === "new" && <NewFeed feed={feed} visible={visible} />}
      {feed && dashStyle === "carousel" && <CarouselFeed feed={feed} visible={visible} />}

      {/* Feature Cards — clean grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {features.map(({ href, icon: Icon, title, color, bg }) => (
          <Link key={href} href={href} className={`${bg} p-3 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition group text-center`}>
            <Icon className={`text-xl ${color} mx-auto mb-1 group-hover:scale-110 transition`} />
            <span className="text-[11px] font-medium text-gray-700 block leading-tight">{title}</span>
          </Link>
        ))}
      </div>

      {/* Machine Status */}
      {!isSagal && visible.has("machines") && machines.length > 0 && (
        <MachineStatus machines={machines} />
      )}

      {/* Footer */}
      <div className="pt-4 pb-2 border-t border-gray-100 flex items-center justify-center gap-6 opacity-40">
        <Image src="/bahad1Logo.png" alt="בהד 1" width={28} height={28} className="rounded-full" />
        <Image src="/erezLogo.png" alt="ארז" width={28} height={28} className="rounded-full" />
      </div>
    </div>
  );
}
