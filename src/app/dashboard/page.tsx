"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { InlineLoading } from "@/components/LoadingScreen";
import Image from "next/image";
import {
  MdLocalLaundryService, MdDry, MdCheckCircle, MdCancel, MdBuild, MdPerson,
  MdMessage, MdFactCheck, MdCake, MdCalendarMonth, MdAssignment, MdPeople,
  MdStar, MdDescription, MdMenuBook, MdFolder, MdWarning, MdSchedule,
  MdPushPin, MdNewReleases, MdNewspaper, MdPoll, MdEmojiEvents,
  MdNotifications, MdStickyNote2, MdRefresh, MdAutoAwesome, MdSecurity, MdAccessTime,
  MdVisibility, MdVisibilityOff, MdTune, MdLocalHospital, MdExpandMore, MdExpandLess, MdDoneAll, MdChevronLeft, MdClose,
  MdVolunteerActivism, MdRestaurant, MdCleaningServices, MdLocalShipping, MdMoreHoriz,
} from "react-icons/md";
import Avatar from "@/components/Avatar";

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

interface DashboardFeed {
  latestMessage: { id: string; title: string; createdAt: string; author: { name: string } } | null;
  pinnedPosts: { id: string; title: string; type: string; dueDate: string | null; author: { name: string } }[];
  todayTasks: { id: string; title: string; startDate: string; category: string; priority: string; dueDate: string | null; status: string }[];
  pendingForms: { id: string; title: string; deadline: string | null }[];
  birthdayUsers: { id: string; name: string; image: string | null }[];
  unreadMaterials: { id: string; title: string; createdAt: string; author: { name: string } }[];
  currentSchedule: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; assignees: { id: string }[]; status: "now" | "next" } | null;
  scheduleItems: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; assignees: { id: string }[]; status: "now" | "next" }[];
  allDaySchedule: { id: string; title: string; type: string; target: string; assignees: { id: string }[] }[];
  myTeamAssignments: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; allDay: boolean }[];
  pendingSurveys: { id: string; title: string; createdAt: string }[];
  pendingPlatoonSurveys: { id: string; title: string; createdAt: string }[];
  platoonSurveyCommanderId: string | null;
  hasVotedThisWeek: boolean;
  dailyQuote: { id: string; text: string; date: string; user: { name: string; team: number | null } } | null;
  todayNotes: { id: string; title: string; startTime: string | null; visibility: string; user: { id: string; name: string } }[];
  nextDutyTables: {
    id: string;
    title: string;
    date: string;
    type: string;
    myAssignments: { role: string; timeSlot: string; partners: string[] }[];
  }[];
  chopalStatus: { registered: boolean; isOpen: boolean; date: string; assignment: { id: string; assignedTime: string; status: string } | null };
  activeVolunteerRequests: { id: string; title: string; category: string; priority: string; status: string; target: string; requiredCount: number; startTime: string; endTime: string; isCommanderRequest: boolean; createdBy: { name: string }; _count: { assignments: number } }[];
  myVolunteerAssignments: { id: string; status: string; request: { id: string; title: string; startTime: string; endTime: string; category: string } }[];
  myCreatedRequests: { id: string; title: string; category: string; status: string; startTime: string; endTime: string; requiredCount: number; _count: { assignments: number } }[];
  urgentReplacement: { id: string; isUrgent: boolean; request: { id: string; title: string } } | null;
}

// Section keys for visibility toggle
type SectionKey = "quote" | "schedule" | "duty" | "teamSchedule" | "notes" | "tasks" | "forms" | "surveys" | "birthdays" | "messages" | "materials" | "commander" | "vote" | "machines" | "chopal" | "volunteers";

const SECTION_LABELS: Record<SectionKey, string> = {
  quote: "משפט היומי",
  schedule: 'לו"ז',
  duty: "תורנויות",
  teamSchedule: "לו\"ז צוות",
  notes: "הערות",
  tasks: "משימות",
  forms: "טפסים",
  surveys: "סקרים",
  birthdays: "ימי הולדת",
  messages: "הודעות",
  materials: "חומר מקצועי",
  commander: "מפקדים",
  vote: "איש השבוע",
  machines: "מכונות",
  chopal: 'חופ"ל',
  volunteers: "התנדבויות",
};

const DEFAULT_VISIBLE: SectionKey[] = Object.keys(SECTION_LABELS) as SectionKey[];

function loadVisibleSections(): Set<SectionKey> {
  if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE);
  try {
    const saved = localStorage.getItem("dashboard-sections");
    if (saved) return new Set(JSON.parse(saved) as SectionKey[]);
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; url: string | null; tag: string | null; read: boolean; createdAt: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [visible, setVisible] = useState<Set<SectionKey>>(() => loadVisibleSections());
  const [dashStyle, setDashStyle] = useState<"new" | "classic" | "carousel">(() => {
    if (typeof window === "undefined") return "new";
    return (localStorage.getItem("dashboard-style") as "new" | "classic" | "carousel") || "new";
  });

  const today = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();
  const currentSlot = `${currentHour.toString().padStart(2, "0")}:00`;

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

  const isMachineAvailable = (machine: Machine) => {
    if (machine.status === "maintenance") return false;
    return !machine.bookings.find((b) => b.date === today && b.timeSlot === currentSlot);
  };

  const getCurrentUser = (machine: Machine) => {
    return machine.bookings.find((b) => b.date === today && b.timeSlot === currentSlot)?.user;
  };

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  const features = [
    { href: "/schedule-daily", icon: MdCalendarMonth, title: 'לו"ז יומי', color: "text-sky-600", bg: "bg-sky-50" },
    { href: "/messages", icon: MdMessage, title: "הודעות", color: "text-blue-600", bg: "bg-blue-50" },
    { href: "/tasks", icon: MdAssignment, title: "משימות", color: "text-purple-600", bg: "bg-purple-50" },
    { href: "/forms", icon: MdDescription, title: "טפסים", color: "text-indigo-600", bg: "bg-indigo-50" },
    { href: "/attendance", icon: MdFactCheck, title: "מצל", color: "text-orange-600", bg: "bg-orange-50" },
    { href: "/commander", icon: MdStar, title: "מפקדים", color: "text-amber-600", bg: "bg-amber-50" },
    { href: "/surveys", icon: MdPoll, title: "סקרים", color: "text-violet-600", bg: "bg-violet-50" },
    { href: "/person-of-week", icon: MdEmojiEvents, title: "איש השבוע", color: "text-yellow-600", bg: "bg-yellow-50" },
    { href: "/issues", icon: MdBuild, title: "תקלות", color: "text-red-600", bg: "bg-red-50" },
    { href: "/users-wall", icon: MdPeople, title: "חיילי הפלוגה", color: "text-teal-600", bg: "bg-teal-50" },
    { href: "/materials", icon: MdMenuBook, title: "חומר מקצועי", color: "text-rose-600", bg: "bg-rose-50" },
    { href: "/formats", icon: MdFolder, title: "פורמטים", color: "text-cyan-600", bg: "bg-cyan-50" },
    { href: "/schedule", icon: MdLocalLaundryService, title: "מכבסה", color: "text-dotan-green", bg: "bg-green-50" },
    { href: "/birthdays", icon: MdCake, title: "ימי הולדת", color: "text-pink-600", bg: "bg-pink-50" },
    { href: "/guard-duty", icon: MdSecurity, title: "תורנויות", color: "text-amber-700", bg: "bg-amber-50" },
    { href: "/daily-quote", icon: MdAutoAwesome, title: "משפט היומי", color: "text-purple-600", bg: "bg-purple-50" },
    { href: "/chopal", icon: MdLocalHospital, title: 'חופ"ל', color: "text-rose-600", bg: "bg-rose-50" },
    { href: "/aktualia", icon: MdNewspaper, title: "אקטואליה", color: "text-emerald-600", bg: "bg-emerald-50" },
    { href: "/notifications", icon: MdNotifications, title: "התראות", color: "text-gray-600", bg: "bg-gray-50" },
    { href: "/profile", icon: MdPerson, title: "פרופיל", color: "text-gray-500", bg: "bg-gray-50" },
  ];

  const firstName = session?.user?.name?.split(" ")[0] || "";

  // Map notification tag/url to correct href with tab support
  const getNotificationHref = (url: string | null, tag: string | null): string => {
    // Platoon surveys go to surveys with platoon tab
    if (tag?.startsWith("survey-new-") && url?.startsWith("/commander")) return "/surveys?tab=platoon";
    if (tag?.startsWith("survey-remind-") && url?.startsWith("/commander")) return "/surveys?tab=platoon";
    // Use the notification's url if present
    if (url) return url;
    // Fallback based on tag prefix
    if (tag?.startsWith("form-")) return "/forms";
    if (tag?.startsWith("issue-")) return "/issues";
    if (tag?.startsWith("schedule-")) return "/schedule-daily";
    if (tag?.startsWith("note-")) return "/schedule-daily";
    if (tag?.startsWith("survey-")) return "/surveys";
    if (tag?.startsWith("commander-")) return "/commander";
    if (tag?.startsWith("material-")) return "/materials";
    if (tag?.startsWith("format-")) return "/formats";
    if (tag?.startsWith("attendance-")) return "/attendance";
    if (tag?.startsWith("chopal-")) return "/chopal";
    if (tag?.startsWith("aktualia-")) return "/aktualia";
    if (tag?.startsWith("message-")) return "/messages";
    if (tag?.startsWith("task-")) return "/tasks";
    if (tag?.startsWith("admin-")) return "/dashboard";
    if (tag?.startsWith("guard-") || tag?.startsWith("duty-")) return "/guard-duty";
    return "/dashboard";
  };

  const getTimeAgo = (dateStr: string): string => {
    const diffMin = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return "עכשיו";
    if (diffMin < 60) return `לפני ${diffMin} דק׳`;
    return `לפני ${Math.floor(diffMin / 60)} שע׳`;
  };

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
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
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

      {/* Settings panel — toggle sections */}
      {showSettings && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">מה להציג בדף הבית?</span>
            <button onClick={() => setShowSettings(false)} className="text-xs text-gray-400 hover:text-gray-600">סגור</button>
          </div>
          {/* Style toggle */}
          <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
            {([["new", "כרטיסים"], ["carousel", "קרוסלה"], ["classic", "קלאסי"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => { setDashStyle(key); localStorage.setItem("dashboard-style", key); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${dashStyle === key ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SECTION_LABELS) as SectionKey[]).map(key => (
              <button key={key} onClick={() => toggleSection(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  visible.has(key) ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-400"
                }`}>
                {visible.has(key) ? <MdVisibility className="text-sm" /> : <MdVisibilityOff className="text-sm" />}
                {SECTION_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Urgent banner — forms + overdue tasks */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
          <MdWarning className="text-red-500 shrink-0" />
          <span className="text-xs font-medium text-red-700 flex-1">
            {urgentCount} פריטים דורשים טיפול
          </span>
          {(feed?.pendingForms.length || 0) > 0 && (
            <Link href="/forms" className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold hover:bg-red-200 transition">
              {feed?.pendingForms.length} טפסים
            </Link>
          )}
        </div>
      )}

      {/* Notification center — last 1 hour */}
      {feed && (
        <div className="mb-3">
          <button
            onClick={() => notifications.length > 0 ? setShowNotifications(!showNotifications) : undefined}
            className="w-full flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:shadow-sm transition"
          >
            <div className="relative">
              <MdNotifications className={`text-lg ${notifications.filter(n => !n.read).length > 0 ? "text-blue-500" : "text-gray-400"}`} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-700 flex-1 text-right">
              {notifications.length > 0 ? `${notifications.length} התראות בשעה האחרונה` : "אין התראות חדשות"}
            </span>
            {notifications.length > 0 && (showNotifications ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-400" />)}
          </button>
          {/* Compact inline preview — max 2 notifications */}
          {showNotifications && notifications.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 2).map(n => {
                  const href = getNotificationHref(n.url, n.tag);
                  const timeAgo = getTimeAgo(n.createdAt);
                  return (
                    <Link key={n.id} href={href} className={`flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 transition ${!n.read ? "bg-blue-50/40" : ""}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800 truncate">{n.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mt-0.5">{n.body.replace(/\n/g, " · ")}</p>
                      </div>
                      <MdChevronLeft className="text-gray-300 mt-1.5 shrink-0" />
                    </Link>
                  );
                })}
              </div>
              {/* Show all button */}
              <button
                onClick={() => { setShowNotifications(false); setShowNotifModal(true); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-gray-100 bg-gray-50 text-xs font-bold text-dotan-green-dark hover:bg-gray-100 transition"
              >
                <MdExpandMore className="text-sm" />
                הצג את כל ההתראות ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notifications full modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowNotifModal(false)}>
          <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MdNotifications className="text-lg text-blue-500" />
                <span className="text-sm font-bold text-gray-800">התראות</span>
                <span className="text-[10px] text-gray-400">שעה אחרונה</span>
              </div>
              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={async () => {
                      await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                    className="flex items-center gap-1 text-[10px] text-dotan-green hover:text-dotan-green-dark font-medium"
                  >
                    <MdDoneAll className="text-xs" /> סמן הכל
                  </button>
                )}
                <button onClick={() => setShowNotifModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <MdClose className="text-lg" />
                </button>
              </div>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {notifications.map(n => {
                const href = getNotificationHref(n.url, n.tag);
                const timeAgo = getTimeAgo(n.createdAt);
                const isScheduleChange = n.tag?.startsWith("schedule-sync") || n.body.includes("עודכנו:") || n.body.includes("נוספו:") || n.body.includes("הוסרו:");

                return (
                  <div key={n.id} className={`px-4 py-3 ${!n.read ? "bg-blue-50/40" : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{n.title}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                        </div>

                        {isScheduleChange ? (
                          <div className="mt-1.5 space-y-1">
                            {n.body.split("\n").map((line, i) => {
                              const trimmed = line.trim();
                              if (!trimmed) return null;
                              if (trimmed === "עודכנו:") return <div key={i} className="text-[10px] font-bold text-amber-600 mt-1">עודכנו</div>;
                              if (trimmed === "נוספו:") return <div key={i} className="text-[10px] font-bold text-green-600 mt-1">נוספו</div>;
                              if (trimmed === "הוסרו:") return <div key={i} className="text-[10px] font-bold text-red-600 mt-1">הוסרו</div>;
                              if (trimmed.startsWith("✏️")) return <div key={i} className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-100">{trimmed}</div>;
                              if (trimmed.startsWith("➕")) return <div key={i} className="text-[11px] text-green-800 bg-green-50 rounded-lg px-2 py-1 border border-green-100">{trimmed}</div>;
                              if (trimmed.startsWith("➖")) return <div key={i} className="text-[11px] text-red-800 bg-red-50 rounded-lg px-2 py-1 border border-red-100">{trimmed}</div>;
                              // Legacy format
                              const parts = trimmed.split(" | ");
                              return parts.map((part, pi) => {
                                const p = part.trim();
                                if (p.startsWith("עודכנו:")) return (
                                  <div key={`${i}-${pi}`}>
                                    <div className="text-[10px] font-bold text-amber-600 mt-1">עודכנו</div>
                                    {p.replace("עודכנו:", "").split(",").map((item, ii) => item.trim() && (
                                      <div key={ii} className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-100 mt-0.5">✏️ {item.trim()}</div>
                                    ))}
                                  </div>
                                );
                                if (p.startsWith("נוספו:")) return (
                                  <div key={`${i}-${pi}`}>
                                    <div className="text-[10px] font-bold text-green-600 mt-1">נוספו</div>
                                    {p.replace("נוספו:", "").split(",").map((item, ii) => item.trim() && (
                                      <div key={ii} className="text-[11px] text-green-800 bg-green-50 rounded-lg px-2 py-1 border border-green-100 mt-0.5">➕ {item.trim()}</div>
                                    ))}
                                  </div>
                                );
                                if (p.startsWith("הוסרו:")) return (
                                  <div key={`${i}-${pi}`}>
                                    <div className="text-[10px] font-bold text-red-600 mt-1">הוסרו</div>
                                    {p.replace("הוסרו:", "").split(",").map((item, ii) => item.trim() && (
                                      <div key={ii} className="text-[11px] text-red-800 bg-red-50 rounded-lg px-2 py-1 border border-red-100 mt-0.5">➖ {item.trim()}</div>
                                    ))}
                                  </div>
                                );
                                return <p key={`${i}-${pi}`} className="text-[11px] text-gray-600">{p}</p>;
                              });
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                        )}

                        <Link
                          href={href}
                          onClick={() => setShowNotifModal(false)}
                          className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg bg-dotan-green-dark/10 text-[10px] font-bold text-dotan-green-dark hover:bg-dotan-green-dark/20 transition"
                        >
                          <MdChevronLeft className="text-xs" />
                          {isScheduleChange ? "עבור ללו\"ז" : "עבור לדף"}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {feed && dashStyle === "classic" && (
        <div className="space-y-2 mb-5">
          {visible.has("quote") && feed.dailyQuote && (
            <Link href="/daily-quote" className="block bg-gradient-to-l from-purple-50/80 to-indigo-50/80 border border-purple-100 rounded-xl px-3.5 py-3 hover:shadow-sm transition">
              <p className="text-[13px] font-medium text-gray-700 leading-relaxed">&ldquo;{feed.dailyQuote.text}&rdquo;</p>
              <span className="text-[10px] text-purple-400 mt-1 block">{feed.dailyQuote.user.name} — משפט היומי</span>
            </Link>
          )}
          {visible.has("schedule") && (feed.currentSchedule || feed.allDaySchedule.length > 0) && (
            <Link href="/schedule-daily" className="block bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm transition">
              <div className="flex items-center gap-2 mb-1">
                <MdCalendarMonth className="text-sm text-dotan-green" />
                <span className="text-[10px] font-bold text-gray-400 tracking-wide">לו&quot;ז היום</span>
              </div>
              {feed.currentSchedule && (() => {
                const cs = feed.currentSchedule;
                return (
                  <div className="flex items-center gap-2">
                    {cs.status === "now" && <span className="w-1.5 h-1.5 rounded-full bg-dotan-green animate-pulse shrink-0" />}
                    <span className="text-sm font-medium text-gray-800 truncate">{cs.title}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 ${cs.target === "all" ? "bg-emerald-50 text-emerald-600" : "bg-cyan-50 text-cyan-600"}`}>
                      {cs.target === "all" ? "פלוגה" : "צוות"}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0 tabular-nums" dir="ltr">
                      {new Date(cs.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}–{new Date(cs.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                    </span>
                  </div>
                );
              })()}
              {feed.allDaySchedule.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                  {feed.allDaySchedule.map((e) => (
                    <span key={e.id} className="text-[11px] text-gray-500">{e.title}</span>
                  ))}
                </div>
              )}
            </Link>
          )}
          {visible.has("duty") && feed.nextDutyTables?.length > 0 && feed.nextDutyTables.map(dt => (
            <Link key={dt.id} href="/guard-duty" className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 hover:shadow-sm transition ${dt.type === "obs" ? "bg-blue-50/60 border-blue-100" : "bg-amber-50/60 border-amber-100"}`}>
              <MdSecurity className={`text-lg shrink-0 ${dt.type === "obs" ? "text-blue-600" : "text-amber-600"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold ${dt.type === "obs" ? "text-blue-700" : "text-amber-700"}`}>{dt.title}</span>
                {dt.myAssignments.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {dt.myAssignments.map((a, i) => (
                      <span key={i} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dt.type === "obs" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {a.role} {a.timeSlot}
                      </span>
                    ))}
                  </div>
                ) : <span className="text-[10px] text-gray-400 block">אין שיבוצים עבורך</span>}
              </div>
            </Link>
          ))}
          {visible.has("teamSchedule") && feed.myTeamAssignments?.length > 0 && (
            <Link href="/schedule-daily" className="flex items-center gap-2.5 bg-teal-50/60 border border-teal-100 rounded-xl px-3 py-2.5 hover:shadow-sm transition">
              <MdCalendarMonth className="text-lg text-teal-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-teal-700">לו&quot;ז צוות</span>
                  <span className="text-[8px] bg-teal-500 text-white px-1 rounded font-bold">עבורך</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {feed.myTeamAssignments.map((e) => (
                    <span key={e.id} className="text-[11px] text-teal-800">
                      <span className="font-bold tabular-nums" dir="ltr">
                        {e.allDay ? "כל היום" : new Date(e.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                      </span>{" "}{e.title}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )}
          {visible.has("forms") && feed.pendingForms.length > 0 && (
            <Link href="/forms" className="flex items-center gap-2.5 bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdDescription className="text-lg text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-amber-700 flex-1 truncate">{feed.pendingForms.length} טפסים למילוי</span>
            </Link>
          )}
          {visible.has("chopal") && feed.chopalStatus?.isOpen && !feed.chopalStatus?.registered && (
            <Link href="/chopal" className="flex items-center gap-2.5 bg-rose-50/60 border border-rose-200 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdLocalHospital className="text-lg text-rose-500 shrink-0" />
              <span className="text-xs font-medium text-rose-700 flex-1 truncate">מסדר חופ&quot;ל — הירשם/י למחר</span>
            </Link>
          )}
          {visible.has("chopal") && feed.chopalStatus?.registered && (
            <Link href="/chopal" className={`flex items-center gap-2.5 rounded-xl px-3 py-2 hover:shadow-sm transition ${
              feed.chopalStatus.assignment?.status === "pending"
                ? "bg-amber-50/60 border border-amber-200"
                : feed.chopalStatus.assignment?.status === "accepted"
                  ? "bg-green-50/60 border border-green-200"
                  : "bg-green-50/60 border border-green-200"
            }`}>
              {feed.chopalStatus.assignment ? (
                <>
                  <MdAccessTime className={`text-lg shrink-0 ${feed.chopalStatus.assignment.status === "pending" ? "text-amber-500" : "text-green-500"}`} />
                  <span className={`text-xs font-medium flex-1 truncate ${feed.chopalStatus.assignment.status === "pending" ? "text-amber-700" : "text-green-700"}`}>
                    חופ&quot;ל — {feed.chopalStatus.assignment.assignedTime}
                    {feed.chopalStatus.assignment.status === "pending" && " (ממתין לאישור)"}
                    {feed.chopalStatus.assignment.status === "accepted" && " ✓"}
                    {feed.chopalStatus.assignment.status === "rejected" && " (נדחה)"}
                  </span>
                </>
              ) : (
                <>
                  <MdCheckCircle className="text-lg text-green-500 shrink-0" />
                  <span className="text-xs font-medium text-green-700 flex-1 truncate">נרשמת לחופ&quot;ל — ממתין/ה לתור</span>
                </>
              )}
            </Link>
          )}
          {visible.has("volunteers") && feed.urgentReplacement && (
            <Link href={`/volunteers?highlight=${feed.urgentReplacement.request.id}`} className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:shadow-sm transition animate-pulse">
              <MdVolunteerActivism className="text-lg text-red-500 shrink-0" />
              <span className="text-xs font-bold text-red-700 flex-1 truncate flex items-center gap-1"><MdWarning className="text-sm shrink-0" /> דרוש/ה מחליף/ה דחוף — {feed.urgentReplacement.request.title}</span>
            </Link>
          )}
          {visible.has("volunteers") && feed.activeVolunteerRequests?.length > 0 && (
            <div className="bg-white border border-green-200 rounded-xl px-3.5 py-2.5">
              <Link href="/volunteers" className="flex items-center gap-2 mb-1.5">
                <MdVolunteerActivism className="text-sm text-green-500" />
                <span className="text-[10px] font-bold text-gray-400">בקשות התנדבות ({feed.activeVolunteerRequests.length})</span>
              </Link>
              <div className="space-y-1.5">
                {feed.activeVolunteerRequests.slice(0, 3).map((r) => {
                  const catIcons: Record<string, typeof MdRestaurant> = { kitchen: MdRestaurant, cleaning: MdCleaningServices, guard: MdSecurity, logistics: MdLocalShipping, general: MdVolunteerActivism, other: MdMoreHoriz };
                  const catColors: Record<string, string> = { kitchen: "text-orange-500", cleaning: "text-blue-500", guard: "text-red-500", logistics: "text-purple-500", general: "text-green-500", other: "text-gray-400" };
                  const CatIcon = catIcons[r.category] || MdMoreHoriz;
                  const filled = r._count.assignments;
                  const start = new Date(r.startTime);
                  const timeStr = start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
                  return (
                    <Link key={r.id} href="/volunteers" className={`flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition ${r.priority === "urgent" ? "bg-red-50 border border-red-100" : ""}`}>
                      <CatIcon className={`text-sm shrink-0 ${catColors[r.category] || "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-gray-700 truncate">{r.title}</p>
                          {r.isCommanderRequest && <MdStar className="text-[10px] text-amber-500 shrink-0" />}
                          {r.priority === "urgent" && <MdWarning className="text-[10px] text-red-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5"><MdAccessTime className="text-[10px]" />{timeStr}</span>
                          <span className={`font-bold ${filled >= r.requiredCount ? "text-green-500" : "text-amber-500"}`}>{filled}/{r.requiredCount}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {visible.has("volunteers") && feed.myVolunteerAssignments?.length > 0 && (
            <div className="bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5">
              <Link href="/volunteers?tab=my" className="flex items-center gap-2 mb-1.5">
                <MdVolunteerActivism className="text-sm text-emerald-500" />
                <span className="text-[10px] font-bold text-gray-400">ההתנדבויות שלי ({feed.myVolunteerAssignments.length})</span>
              </Link>
              <div className="space-y-1.5">
                {feed.myVolunteerAssignments.slice(0, 3).map((a) => {
                  const catIcons: Record<string, typeof MdRestaurant> = { kitchen: MdRestaurant, cleaning: MdCleaningServices, guard: MdSecurity, logistics: MdLocalShipping, general: MdVolunteerActivism, other: MdMoreHoriz };
                  const catColors: Record<string, string> = { kitchen: "text-orange-500", cleaning: "text-blue-500", guard: "text-red-500", logistics: "text-purple-500", general: "text-green-500", other: "text-gray-400" };
                  const CatIcon = catIcons[a.request.category] || MdMoreHoriz;
                  const start = new Date(a.request.startTime);
                  const end = new Date(a.request.endTime);
                  const timeStr = `${start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}–${end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}`;
                  const isNow = new Date() >= start && new Date() <= end;
                  return (
                    <Link key={a.id} href="/volunteers?tab=my" className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${isNow ? "bg-emerald-50 border border-emerald-100" : "hover:bg-gray-50"}`}>
                      <CatIcon className={`text-sm shrink-0 ${catColors[a.request.category] || "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isNow ? "text-emerald-700" : "text-gray-700"}`}>{a.request.title}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <MdAccessTime className="text-[10px]" /> {timeStr}
                          {isNow && <span className="text-emerald-500 font-bold mr-1 flex items-center gap-0.5"><MdSchedule className="text-[10px]" />עכשיו</span>}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {visible.has("volunteers") && feed.myCreatedRequests?.length > 0 && (
            <div className="bg-white border border-teal-200 rounded-xl px-3.5 py-2.5">
              <Link href="/volunteers" className="flex items-center gap-2 mb-1.5">
                <MdVolunteerActivism className="text-sm text-teal-500" />
                <span className="text-[10px] font-bold text-gray-400">תורנויות שיצרתי ({feed.myCreatedRequests.length})</span>
              </Link>
              <div className="space-y-1.5">
                {feed.myCreatedRequests.slice(0, 3).map((r) => {
                  const filled = r._count.assignments;
                  const pct = Math.min(100, Math.round((filled / r.requiredCount) * 100));
                  return (
                    <Link key={r.id} href="/volunteers" className="block rounded-lg px-2 py-1.5 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700 truncate flex-1">{r.title}</p>
                        <span className={`text-[10px] font-bold ${filled >= r.requiredCount ? "text-green-600" : "text-amber-600"}`}>{filled}/{r.requiredCount}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${filled >= r.requiredCount ? "bg-green-400" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {visible.has("surveys") && (feed.pendingSurveys?.length > 0 || feed.pendingPlatoonSurveys?.length > 0) && (
            <Link href="/surveys" className="flex items-center gap-2.5 bg-violet-50/60 border border-violet-100 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdPoll className="text-lg text-violet-500 shrink-0" />
              <span className="text-xs font-medium text-violet-700 flex-1 truncate">{(feed.pendingSurveys?.length || 0) + (feed.pendingPlatoonSurveys?.length || 0)} סקרים ממתינים</span>
            </Link>
          )}
          {visible.has("tasks") && feed.todayTasks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5">
              <Link href="/tasks" className="flex items-center gap-2 mb-1.5">
                <MdAssignment className="text-sm text-purple-500" />
                <span className="text-[10px] font-bold text-gray-400">משימות ({feed.todayTasks.length})</span>
              </Link>
              <div className="space-y-1">
                {feed.todayTasks.slice(0, 4).map((t) => (
                  <Link key={t.id} href="/tasks" className="flex items-center gap-2 group">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-400" : "bg-gray-300"}`} />
                    <span className={`text-xs truncate flex-1 group-hover:underline ${t.dueDate && new Date(t.dueDate) < new Date() ? "text-red-600 font-medium" : "text-gray-600"}`}>{t.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {visible.has("messages") && feed.latestMessage && (
            <Link href="/messages" className="flex items-center gap-2.5 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdMessage className="text-base text-blue-500 shrink-0" />
              <span className="text-xs font-medium text-blue-700 truncate flex-1">{feed.latestMessage.title}</span>
            </Link>
          )}
          {visible.has("birthdays") && feed.birthdayUsers.length > 0 && (
            <Link href="/birthdays" className="flex items-center gap-2.5 bg-pink-50/60 border border-pink-100 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdCake className="text-lg text-pink-500 shrink-0" />
              <span className="text-xs font-medium text-pink-700 flex-1 truncate">יום הולדת: {feed.birthdayUsers.map((u) => u.name).join(", ")}</span>
            </Link>
          )}
          {visible.has("materials") && feed.unreadMaterials.length > 0 && (
            <Link href="/materials" className="flex items-center gap-2.5 bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdNewReleases className="text-base text-rose-500 shrink-0" />
              <span className="text-xs font-medium text-rose-700 truncate flex-1">{feed.unreadMaterials.length} חומרים שלא נקראו</span>
            </Link>
          )}
        </div>
      )}

      {feed && dashStyle === "new" && (
        <div className="space-y-3 mb-5">
          {/* Daily quote — elegant */}
          {visible.has("quote") && feed.dailyQuote && (
            <Link href="/daily-quote" className="block bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-purple-100/60 rounded-2xl px-4 py-3.5 hover:shadow-md transition relative overflow-hidden">
              <div className="absolute top-1 left-2 text-6xl text-purple-100 font-serif leading-none select-none">&ldquo;</div>
              <p className="text-[13px] font-medium text-gray-700 leading-relaxed relative z-10">{feed.dailyQuote.text}</p>
              <span className="text-[10px] text-purple-400 mt-1.5 block relative z-10">— {feed.dailyQuote.user.name}</span>
            </Link>
          )}

          {/* Schedule glance — show all current + next */}
          {visible.has("schedule") && ((feed.scheduleItems?.length > 0) || feed.allDaySchedule.length > 0) && (
            <Link href="/schedule-daily" className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="bg-gradient-to-l from-emerald-500 to-dotan-green px-3.5 py-2 flex items-center gap-2">
                <MdCalendarMonth className="text-sm text-white/90" />
                <span className="text-[11px] font-bold text-white/90">לו&quot;ז היום</span>
                {feed.scheduleItems?.some(s => s.status === "now") && (
                  <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold mr-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> עכשיו
                  </span>
                )}
              </div>
              <div className="px-3.5 py-2.5 space-y-1.5">
                {(feed.scheduleItems || []).map((ev) => {
                  const isNow = ev.status === "now";
                  return (
                    <div key={ev.id} className={`flex items-center gap-2.5 ${!isNow ? "opacity-60" : ""}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isNow ? "bg-green-500 animate-pulse ring-4 ring-green-100" : "bg-gray-300"}`} />
                      <span className="text-[11px] font-bold text-gray-500 tabular-nums shrink-0 w-[90px]" dir="ltr">
                        {new Date(ev.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                        {" – "}
                        {new Date(ev.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 truncate">{ev.title}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${ev.target === "all" ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"}`}>
                        {ev.target === "all" ? "פלוגה" : "צוות"}
                      </span>
                      {ev.assignees?.length > 0 && <span className="text-[8px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">עבורך</span>}
                    </div>
                  );
                })}
                {feed.allDaySchedule.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-50">
                    {feed.allDaySchedule.map((e) => (
                      <span key={e.id} className={`text-[10px] px-2 py-0.5 rounded-full border ${e.target === "all" ? "bg-gray-50 text-gray-600 border-gray-100" : "bg-cyan-50 text-cyan-700 border-cyan-100"}`}>
                        {e.target !== "all" && <span className="font-bold ml-0.5">צוות</span>}
                        {e.title}
                        {e.assignees?.length > 0 && <span className="text-teal-600 font-bold mr-0.5"> ⭐</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Duty tables — card style */}
          {visible.has("duty") && feed.nextDutyTables?.length > 0 && (
            <div className="space-y-2">
              {feed.nextDutyTables.map(dt => {
                const isObs = dt.type === "obs";
                return (
                  <Link key={dt.id} href="/guard-duty" className={`block rounded-2xl border overflow-hidden hover:shadow-md transition ${
                    isObs ? "border-blue-100" : "border-amber-100"
                  }`}>
                    <div className={`px-3.5 py-2 flex items-center gap-2 ${isObs ? "bg-gradient-to-l from-blue-500 to-indigo-500" : "bg-gradient-to-l from-amber-500 to-orange-500"}`}>
                      <MdSecurity className="text-sm text-white/90" />
                      <span className="text-[11px] font-bold text-white/90">{dt.title}</span>
                      <span className="text-[10px] text-white/60 mr-auto">
                        {new Date(dt.date + "T12:00:00").toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="px-3.5 py-2 bg-white">
                      {dt.myAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {dt.myAssignments.map((a, i) => (
                            <span key={i} className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                              isObs ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {a.role} · {a.timeSlot}
                              {a.partners.length > 0 && <span className="font-normal opacity-70"> (עם {a.partners.join(", ")})</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">אין שיבוצים עבורך</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Team schedule assignments — prominent card */}
          {visible.has("teamSchedule") && feed.myTeamAssignments?.length > 0 && (
            <Link href="/schedule-daily" className="block rounded-2xl overflow-hidden border border-teal-100 hover:shadow-md transition">
              <div className="bg-gradient-to-l from-teal-500 to-cyan-500 px-3.5 py-2 flex items-center gap-2">
                <MdCalendarMonth className="text-sm text-white/90" />
                <span className="text-[11px] font-bold text-white/90">לו&quot;ז צוות — עבורך</span>
                <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold mr-auto">{feed.myTeamAssignments.length}</span>
              </div>
              <div className="px-3 py-2.5 bg-gradient-to-br from-teal-50/50 to-white space-y-1.5">
                {feed.myTeamAssignments.map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 bg-white rounded-lg px-2.5 py-1.5 border border-teal-100 shadow-sm">
                    <span className="text-[11px] font-bold text-teal-600 tabular-nums shrink-0 w-12 text-center" dir="ltr">
                      {e.allDay ? "כל היום" : new Date(e.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                    </span>
                    <div className="w-px h-4 bg-teal-200" />
                    <span className="text-xs font-medium text-gray-800 truncate">{e.title}</span>
                  </div>
                ))}
              </div>
            </Link>
          )}

          {/* Action items — 2-col grid for smaller items */}
          {(() => {
            const actionItems: { key: string; href: string; icon: typeof MdDescription; iconColor: string; bg: string; border: string; textColor: string; label: string }[] = [];
            if (visible.has("notes") && feed.todayNotes?.length > 0)
              actionItems.push({ key: "notes", href: "/schedule-daily", icon: MdStickyNote2, iconColor: "text-amber-500", bg: "from-amber-50 to-orange-50", border: "border-amber-100", textColor: "text-amber-700", label: `${feed.todayNotes.length} הערות` });
            if (visible.has("forms") && feed.pendingForms.length > 0)
              actionItems.push({ key: "forms", href: "/forms", icon: MdDescription, iconColor: "text-orange-500", bg: "from-orange-50 to-amber-50", border: "border-orange-100", textColor: "text-orange-700", label: `${feed.pendingForms.length} טפסים למילוי` });
            if (visible.has("chopal") && feed.chopalStatus?.isOpen && !feed.chopalStatus?.registered)
              actionItems.push({ key: "chopal", href: "/chopal", icon: MdLocalHospital, iconColor: "text-rose-500", bg: "from-rose-50 to-pink-50", border: "border-rose-100", textColor: "text-rose-700", label: 'חופ"ל — הירשם/י' });
            if (visible.has("chopal") && feed.chopalStatus?.registered) {
              const ca = feed.chopalStatus.assignment;
              const chopalLabel = ca
                ? ca.status === "pending" ? `חופ"ל ${ca.assignedTime} — אשר/י` : ca.status === "accepted" ? `חופ"ל ${ca.assignedTime} ✓` : 'חופ"ל — נדחה'
                : 'נרשמת לחופ"ל — ממתין לתור';
              const chopalIcon = ca?.status === "pending" ? MdAccessTime : MdCheckCircle;
              const chopalColor = ca?.status === "pending" ? "text-amber-500" : "text-green-500";
              const chopalBg = ca?.status === "pending" ? "from-amber-50 to-orange-50" : "from-green-50 to-emerald-50";
              const chopalBorder = ca?.status === "pending" ? "border-amber-100" : "border-green-100";
              const chopalText = ca?.status === "pending" ? "text-amber-700" : "text-green-700";
              actionItems.push({ key: "chopal-done", href: "/chopal", icon: chopalIcon, iconColor: chopalColor, bg: chopalBg, border: chopalBorder, textColor: chopalText, label: chopalLabel });
            }
            if (visible.has("volunteers") && feed.urgentReplacement)
              actionItems.push({ key: "vol-urgent", href: `/volunteers?highlight=${feed.urgentReplacement.request.id}`, icon: MdVolunteerActivism, iconColor: "text-red-500", bg: "from-red-50 to-rose-50", border: "border-red-200", textColor: "text-red-700", label: `דרוש/ה מחליף/ה — ${feed.urgentReplacement.request.title}` });
            if (visible.has("volunteers") && feed.activeVolunteerRequests?.length > 0)
              actionItems.push({ key: "vol-active", href: "/volunteers", icon: MdVolunteerActivism, iconColor: "text-green-500", bg: "from-green-50 to-emerald-50", border: "border-green-100", textColor: "text-green-700", label: `${feed.activeVolunteerRequests.length} בקשות התנדבות` });
            if (visible.has("volunteers") && feed.myVolunteerAssignments?.length > 0) {
              const nowVol = feed.myVolunteerAssignments.find(a => { const s = new Date(a.request.startTime); const e = new Date(a.request.endTime); const n = new Date(); return n >= s && n <= e; });
              const volLabel = nowVol ? `${nowVol.request.title} — עכשיו` : `${feed.myVolunteerAssignments.length} שיבוצי התנדבות`;
              actionItems.push({ key: "vol-my", href: "/volunteers?tab=my", icon: MdCheckCircle, iconColor: nowVol ? "text-emerald-600" : "text-emerald-500", bg: nowVol ? "from-emerald-100 to-green-100" : "from-emerald-50 to-green-50", border: nowVol ? "border-emerald-300" : "border-emerald-100", textColor: nowVol ? "text-emerald-800" : "text-emerald-700", label: volLabel });
            }
            if (visible.has("volunteers") && feed.myCreatedRequests?.length > 0) {
              const totalFilled = feed.myCreatedRequests.reduce((s, r) => s + r._count.assignments, 0);
              const totalNeeded = feed.myCreatedRequests.reduce((s, r) => s + r.requiredCount, 0);
              actionItems.push({ key: "vol-created", href: "/volunteers", icon: MdVolunteerActivism, iconColor: "text-teal-500", bg: "from-teal-50 to-cyan-50", border: "border-teal-100", textColor: "text-teal-700", label: `${feed.myCreatedRequests.length} תורנויות שלי (${totalFilled}/${totalNeeded})` });
            }
            if (visible.has("surveys") && (feed.pendingSurveys?.length > 0 || feed.pendingPlatoonSurveys?.length > 0))
              actionItems.push({ key: "surveys", href: "/surveys", icon: MdPoll, iconColor: "text-violet-500", bg: "from-violet-50 to-purple-50", border: "border-violet-100", textColor: "text-violet-700", label: `${(feed.pendingSurveys?.length || 0) + (feed.pendingPlatoonSurveys?.length || 0)} סקרים ממתינים` });
            if (visible.has("vote") && feed.hasVotedThisWeek === false)
              actionItems.push({ key: "vote", href: "/person-of-week", icon: MdEmojiEvents, iconColor: "text-yellow-500", bg: "from-yellow-50 to-amber-50", border: "border-yellow-100", textColor: "text-yellow-700", label: "בחרו איש/ת השבוע!" });
            if (visible.has("materials") && feed.unreadMaterials.length > 0)
              actionItems.push({ key: "materials", href: "/materials", icon: MdNewReleases, iconColor: "text-rose-500", bg: "from-rose-50 to-red-50", border: "border-rose-100", textColor: "text-rose-700", label: `${feed.unreadMaterials.length} חומרים חדשים` });

            if (actionItems.length === 0) return null;
            return (
              <div className={`grid gap-2 ${actionItems.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {actionItems.map(({ key, href, icon: Icon, iconColor, bg, border, textColor, label }) => (
                  <Link key={key} href={href} className={`flex items-center gap-2.5 bg-gradient-to-br ${bg} border ${border} rounded-2xl px-3 py-2.5 hover:shadow-md transition`}>
                    <div className={`w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className={`text-lg ${iconColor}`} />
                    </div>
                    <span className={`text-[11px] font-semibold ${textColor} leading-tight`}>{label}</span>
                  </Link>
                ))}
              </div>
            );
          })()}

          {/* Birthdays — special */}
          {visible.has("birthdays") && feed.birthdayUsers.length > 0 && (
            <Link href="/birthdays" className="flex items-center gap-3 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl px-3.5 py-3 hover:shadow-md transition">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-sm shrink-0">
                <MdCake className="text-lg text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-pink-400 font-bold block">יום הולדת שמח!</span>
                <span className="text-xs font-semibold text-pink-700 truncate block">{feed.birthdayUsers.map((u) => u.name).join(", ")}</span>
              </div>
              <div className="flex -space-x-1.5 shrink-0">
                {feed.birthdayUsers.slice(0, 3).map((u) => (
                  <Avatar key={u.id} name={u.name} image={u.image} size="xs" />
                ))}
              </div>
            </Link>
          )}

          {/* Tasks — card with list */}
          {visible.has("tasks") && feed.todayTasks.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-l from-purple-500 to-indigo-500 px-3.5 py-2 flex items-center gap-2">
                <MdAssignment className="text-sm text-white/90" />
                <span className="text-[11px] font-bold text-white/90">משימות ({feed.todayTasks.length})</span>
              </div>
              <div className="px-3.5 py-2.5 space-y-1.5">
                {feed.todayTasks.slice(0, 4).map((t) => {
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                  return (
                    <Link key={t.id} href="/tasks" className="flex items-center gap-2 group">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-400" : "bg-gray-300"
                      }`} />
                      <span className={`text-xs truncate flex-1 group-hover:underline ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>{t.title}</span>
                      {isOverdue && <span className="text-[9px] text-red-500 font-bold shrink-0">באיחור</span>}
                    </Link>
                  );
                })}
                {feed.todayTasks.length > 4 && (
                  <Link href="/tasks" className="text-[10px] text-purple-500 hover:underline block">+ עוד {feed.todayTasks.length - 4}</Link>
                )}
              </div>
            </div>
          )}

          {/* Commander pinned */}
          {visible.has("commander") && feed.pinnedPosts.length > 0 && (
            <div className="space-y-2">
              {feed.pinnedPosts.map((post) => (
                <Link key={post.id} href="/commander" className="flex items-center gap-2.5 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-100 rounded-2xl px-3.5 py-2.5 hover:shadow-md transition">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm shrink-0">
                    <MdPushPin className="text-sm text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-800 truncate block">{post.title}</span>
                    <span className="text-[10px] text-yellow-600">
                      {post.author.name}
                      {post.dueDate && <> · {new Date(post.dueDate + "T12:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</>}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Messages */}
          {visible.has("messages") && feed.latestMessage && (
            <Link href="/messages" className="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-3.5 py-2.5 hover:shadow-md transition">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
                <MdMessage className="text-sm text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-gray-800 truncate block">{feed.latestMessage.title}</span>
                <span className="text-[10px] text-blue-500">{feed.latestMessage.author.name}</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Carousel view */}
      {feed && dashStyle === "carousel" && (
        <CarouselFeed feed={feed} visible={visible} />
      )}

      {/* Feature Cards — clean grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {features.map(({ href, icon: Icon, title, color, bg }) => (
          <Link key={href} href={href} className={`${bg} p-3 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition group text-center`}>
            <Icon className={`text-xl ${color} mx-auto mb-1 group-hover:scale-110 transition`} />
            <span className="text-[11px] font-medium text-gray-700 block leading-tight">{title}</span>
          </Link>
        ))}
      </div>

      {/* Machine Status — compact */}
      {visible.has("machines") && machines.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
            <MdLocalLaundryService className="text-base" /> מכונות
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {machines.map((machine) => {
              const available = isMachineAvailable(machine);
              const currentUser = getCurrentUser(machine);
              const isWasher = machine.type === "washer";
              return (
                <div key={machine.id} className={`px-3 py-2.5 rounded-xl border transition ${
                  machine.status === "maintenance" ? "bg-yellow-50 border-yellow-200"
                  : available ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">{machine.name}</span>
                    {isWasher ? <MdLocalLaundryService className={`text-base ${available ? "text-green-500" : "text-red-400"}`} /> : <MdDry className={`text-base ${available ? "text-green-500" : "text-red-400"}`} />}
                  </div>
                  <div className={`text-[10px] font-medium mt-0.5 flex items-center gap-0.5 ${
                    machine.status === "maintenance" ? "text-yellow-600" : available ? "text-green-600" : "text-red-500"
                  }`}>
                    {machine.status === "maintenance" ? <><MdBuild className="text-[10px]" /> תחזוקה</>
                    : available ? <><MdCheckCircle className="text-[10px]" /> {isWasher ? "פנויה" : "פנוי"}</>
                    : <><MdCancel className="text-[10px]" /> {currentUser?.name || (isWasher ? "תפוסה" : "תפוס")}</>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 pb-2 border-t border-gray-100 flex items-center justify-center gap-6 opacity-40">
        <Image src="/bahad1Logo.png" alt="בהד 1" width={28} height={28} className="rounded-full" />
        <Image src="/erezLogo.png" alt="ארז" width={28} height={28} className="rounded-full" />
      </div>
    </div>
  );
}

// ─── Carousel Feed Component ───

interface CarouselCard {
  key: string;
  href: string;
  gradient: string;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  content?: React.ReactNode;
}

function CarouselFeed({ feed, visible }: { feed: DashboardFeed; visible: Set<SectionKey> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const cards: CarouselCard[] = [];

  // Quote
  if (visible.has("quote") && feed.dailyQuote) {
    cards.push({
      key: "quote",
      href: "/daily-quote",
      gradient: "from-indigo-500 via-purple-500 to-pink-500",
      iconBg: "bg-white/20",
      icon: <MdAutoAwesome className="text-xl text-white" />,
      title: "משפט היומי",
      subtitle: feed.dailyQuote.user.name,
      content: (
        <p className="text-white/90 text-sm leading-relaxed mt-2 line-clamp-3">&ldquo;{feed.dailyQuote.text}&rdquo;</p>
      ),
    });
  }

  // Schedule
  if (visible.has("schedule") && ((feed.scheduleItems?.length > 0) || feed.allDaySchedule.length > 0)) {
    const hasNow = feed.scheduleItems?.some(s => s.status === "now");
    cards.push({
      key: "schedule",
      href: "/schedule-daily",
      gradient: hasNow ? "from-green-500 to-emerald-600" : "from-emerald-500 to-teal-600",
      iconBg: "bg-white/20",
      icon: <MdCalendarMonth className="text-xl text-white" />,
      title: "לו\"ז היום",
      subtitle: hasNow ? "עכשיו" : undefined,
      content: (
        <div className="mt-2 space-y-1">
          {(feed.scheduleItems || []).slice(0, 4).map(ev => (
            <div key={ev.id} className={`flex items-center gap-2 ${ev.status !== "now" ? "opacity-60" : ""}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.status === "now" ? "bg-white animate-pulse" : "bg-white/40"}`} />
              <span className="text-[10px] text-white/70 tabular-nums shrink-0" dir="ltr">
                {new Date(ev.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </span>
              <span className="text-xs text-white truncate">{ev.title}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 ${ev.target === "all" ? "bg-white/15 text-white/80" : "bg-cyan-300/25 text-cyan-100"}`}>
                {ev.target === "all" ? "פלוגה" : "צוות"}
              </span>
            </div>
          ))}
          {feed.allDaySchedule.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {feed.allDaySchedule.slice(0, 3).map(e => (
                <span key={e.id} className="text-[10px] bg-white/15 text-white/80 px-2 py-0.5 rounded-full">{e.title}</span>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  // Duty
  if (visible.has("duty") && feed.nextDutyTables?.length > 0) {
    for (const dt of feed.nextDutyTables) {
      const isObs = dt.type === "obs";
      cards.push({
        key: `duty-${dt.id}`,
        href: "/guard-duty",
        gradient: isObs ? "from-blue-500 to-indigo-600" : "from-amber-500 to-orange-600",
        iconBg: "bg-white/20",
        icon: <MdSecurity className="text-xl text-white" />,
        title: dt.title,
        subtitle: new Date(dt.date + "T12:00:00").toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" }),
        content: dt.myAssignments.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {dt.myAssignments.map((a, i) => (
              <span key={i} className="text-[10px] bg-white/20 text-white px-2 py-1 rounded-lg font-medium">
                {a.role} · {a.timeSlot}
              </span>
            ))}
          </div>
        ) : <p className="text-white/60 text-xs mt-2">אין שיבוצים עבורך</p>,
      });
    }
  }

  // Team assignments
  if (visible.has("teamSchedule") && feed.myTeamAssignments?.length > 0) {
    cards.push({
      key: "team",
      href: "/schedule-daily",
      gradient: "from-teal-500 to-cyan-600",
      iconBg: "bg-white/20",
      icon: <MdCalendarMonth className="text-xl text-white" />,
      title: "לו\"ז צוות — עבורך",
      subtitle: `${feed.myTeamAssignments.length} משימות`,
      content: (
        <div className="space-y-1 mt-2">
          {feed.myTeamAssignments.slice(0, 3).map(e => (
            <div key={e.id} className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
              <span className="text-[11px] font-bold text-white/80 tabular-nums w-12 text-center" dir="ltr">
                {e.allDay ? "כל היום" : new Date(e.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </span>
              <span className="text-xs text-white truncate">{e.title}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  // Tasks
  if (visible.has("tasks") && feed.todayTasks.length > 0) {
    cards.push({
      key: "tasks",
      href: "/tasks",
      gradient: "from-purple-500 to-indigo-600",
      iconBg: "bg-white/20",
      icon: <MdAssignment className="text-xl text-white" />,
      title: `${feed.todayTasks.length} משימות`,
      content: (
        <div className="space-y-1 mt-2">
          {feed.todayTasks.slice(0, 3).map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.priority === "urgent" ? "bg-red-300" : t.priority === "high" ? "bg-orange-300" : "bg-white/40"}`} />
              <span className="text-xs text-white/90 truncate">{t.title}</span>
            </div>
          ))}
          {feed.todayTasks.length > 3 && <span className="text-[10px] text-white/50">+ עוד {feed.todayTasks.length - 3}</span>}
        </div>
      ),
    });
  }

  // Forms
  if (visible.has("forms") && feed.pendingForms.length > 0) {
    cards.push({
      key: "forms",
      href: "/forms",
      gradient: "from-orange-500 to-amber-600",
      iconBg: "bg-white/20",
      icon: <MdDescription className="text-xl text-white" />,
      title: `${feed.pendingForms.length} טפסים למילוי`,
      content: (
        <div className="space-y-0.5 mt-2">
          {feed.pendingForms.slice(0, 3).map(f => (
            <p key={f.id} className="text-xs text-white/80 truncate">{f.title}</p>
          ))}
        </div>
      ),
    });
  }

  // Chopal
  if (visible.has("chopal") && feed.chopalStatus?.isOpen && !feed.chopalStatus?.registered) {
    cards.push({
      key: "chopal",
      href: "/chopal",
      gradient: "from-rose-500 to-pink-600",
      iconBg: "bg-white/20",
      icon: <MdLocalHospital className="text-xl text-white" />,
      title: "מסדר חופ\"ל",
      subtitle: "הירשם/י למחר (עד 21:00)",
    });
  }
  if (visible.has("chopal") && feed.chopalStatus?.registered) {
    const ca = feed.chopalStatus.assignment;
    cards.push({
      key: "chopal-done",
      href: "/chopal",
      gradient: ca?.status === "pending" ? "from-amber-500 to-orange-600" : "from-green-500 to-emerald-600",
      iconBg: "bg-white/20",
      icon: ca ? <MdAccessTime className="text-xl text-white" /> : <MdCheckCircle className="text-xl text-white" />,
      title: ca ? `חופ"ל — ${ca.assignedTime}` : "נרשמת לחופ\"ל",
      subtitle: ca?.status === "pending" ? "ממתין לאישור" : ca?.status === "accepted" ? "אושר ✓" : ca?.status === "rejected" ? "נדחה" : "ממתין לתור",
    });
  }

  // Volunteers
  if (visible.has("volunteers") && feed.urgentReplacement) {
    cards.push({
      key: "vol-urgent",
      href: `/volunteers?highlight=${feed.urgentReplacement.request.id}`,
      gradient: "from-red-500 to-rose-600",
      iconBg: "bg-white/20",
      icon: <MdVolunteerActivism className="text-xl text-white" />,
      title: "דרוש/ה מחליף/ה דחוף!",
      subtitle: feed.urgentReplacement.request.title,
    });
  }
  if (visible.has("volunteers") && feed.activeVolunteerRequests?.length > 0) {
    cards.push({
      key: "vol-active",
      href: "/volunteers",
      gradient: "from-green-500 to-emerald-600",
      iconBg: "bg-white/20",
      icon: <MdVolunteerActivism className="text-xl text-white" />,
      title: `${feed.activeVolunteerRequests.length} בקשות התנדבות`,
      subtitle: feed.activeVolunteerRequests[0]?.title,
    });
  }
  if (visible.has("volunteers") && feed.myVolunteerAssignments?.length > 0) {
    const nowV = feed.myVolunteerAssignments.find(a => { const s = new Date(a.request.startTime); const e = new Date(a.request.endTime); const n = new Date(); return n >= s && n <= e; });
    cards.push({
      key: "vol-my",
      href: "/volunteers?tab=my",
      gradient: nowV ? "from-emerald-600 to-green-700" : "from-emerald-500 to-teal-600",
      iconBg: "bg-white/20",
      icon: <MdCheckCircle className="text-xl text-white" />,
      title: nowV ? nowV.request.title : `${feed.myVolunteerAssignments.length} שיבוצי התנדבות`,
      subtitle: nowV ? "בהתנדבות עכשיו" : feed.myVolunteerAssignments[0]?.request.title,
    });
  }
  if (visible.has("volunteers") && feed.myCreatedRequests?.length > 0) {
    cards.push({
      key: "vol-created",
      href: "/volunteers",
      gradient: "from-teal-500 to-cyan-600",
      iconBg: "bg-white/20",
      icon: <MdVolunteerActivism className="text-xl text-white" />,
      title: `${feed.myCreatedRequests.length} תורנויות שיצרת`,
      subtitle: `${feed.myCreatedRequests.reduce((s, r) => s + r._count.assignments, 0)} מתנדבים שובצו`,
    });
  }

  // Surveys
  if (visible.has("surveys") && (feed.pendingSurveys?.length > 0 || feed.pendingPlatoonSurveys?.length > 0)) {
    const total = (feed.pendingSurveys?.length || 0) + (feed.pendingPlatoonSurveys?.length || 0);
    cards.push({
      key: "surveys",
      href: "/surveys",
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-white/20",
      icon: <MdPoll className="text-xl text-white" />,
      title: `${total} סקרים ממתינים`,
    });
  }

  // Birthdays
  if (visible.has("birthdays") && feed.birthdayUsers.length > 0) {
    cards.push({
      key: "birthdays",
      href: "/birthdays",
      gradient: "from-pink-500 to-rose-600",
      iconBg: "bg-white/20",
      icon: <MdCake className="text-xl text-white" />,
      title: "יום הולדת שמח!",
      subtitle: feed.birthdayUsers.map(u => u.name).join(", "),
      content: (
        <div className="flex -space-x-2 mt-2">
          {feed.birthdayUsers.slice(0, 4).map(u => (
            <Avatar key={u.id} name={u.name} image={u.image} size="sm" />
          ))}
        </div>
      ),
    });
  }

  // Messages
  if (visible.has("messages") && feed.latestMessage) {
    cards.push({
      key: "messages",
      href: "/messages",
      gradient: "from-blue-500 to-indigo-600",
      iconBg: "bg-white/20",
      icon: <MdMessage className="text-xl text-white" />,
      title: feed.latestMessage.title,
      subtitle: feed.latestMessage.author.name,
    });
  }

  // Commander
  if (visible.has("commander") && feed.pinnedPosts.length > 0) {
    cards.push({
      key: "commander",
      href: "/commander",
      gradient: "from-yellow-500 to-amber-600",
      iconBg: "bg-white/20",
      icon: <MdPushPin className="text-xl text-white" />,
      title: feed.pinnedPosts[0].title,
      subtitle: feed.pinnedPosts[0].author.name,
    });
  }

  // Vote
  if (visible.has("vote") && feed.hasVotedThisWeek === false) {
    cards.push({
      key: "vote",
      href: "/person-of-week",
      gradient: "from-yellow-400 to-orange-500",
      iconBg: "bg-white/20",
      icon: <MdEmojiEvents className="text-xl text-white" />,
      title: "בחרו את איש/ת השבוע!",
    });
  }

  // Materials
  if (visible.has("materials") && feed.unreadMaterials.length > 0) {
    cards.push({
      key: "materials",
      href: "/materials",
      gradient: "from-rose-500 to-red-600",
      iconBg: "bg-white/20",
      icon: <MdNewReleases className="text-xl text-white" />,
      title: `${feed.unreadMaterials.length} חומרים חדשים`,
    });
  }

  // Notes
  if (visible.has("notes") && feed.todayNotes?.length > 0) {
    cards.push({
      key: "notes",
      href: "/schedule-daily",
      gradient: "from-amber-500 to-yellow-600",
      iconBg: "bg-white/20",
      icon: <MdStickyNote2 className="text-xl text-white" />,
      title: `${feed.todayNotes.length} הערות להיום`,
    });
  }

  if (cards.length === 0) return null;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = el.scrollWidth / cards.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, cards.length - 1));
  };

  return (
    <div className="mb-5 -mx-4">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={`snap-center shrink-0 w-[75vw] max-w-[300px] rounded-2xl bg-gradient-to-br ${card.gradient} p-4 shadow-lg hover:shadow-xl transition-shadow min-h-[140px] flex flex-col`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center backdrop-blur-sm`}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{card.title}</h3>
                {card.subtitle && <p className="text-[11px] text-white/60 truncate">{card.subtitle}</p>}
              </div>
            </div>
            {card.content && <div className="flex-1">{card.content}</div>}
          </Link>
        ))}
      </div>
      {/* Dots indicator */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1 mt-1">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === activeIdx ? "w-4 h-1.5 bg-dotan-green" : "w-1.5 h-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
