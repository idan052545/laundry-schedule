"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { InlineLoading } from "@/components/LoadingScreen";
import Image from "next/image";
import {
  MdLocalLaundryService, MdDry, MdCheckCircle, MdCancel, MdBuild, MdPerson,
  MdMessage, MdFactCheck, MdCake, MdCalendarMonth, MdAssignment, MdPeople,
  MdStar, MdDescription, MdMenuBook, MdFolder, MdWarning, MdSchedule,
  MdPushPin, MdNewReleases, MdNewspaper, MdPoll, MdEmojiEvents,
  MdNotifications, MdStickyNote2, MdRefresh, MdAutoAwesome, MdSecurity, MdAccessTime,
  MdVisibility, MdVisibilityOff, MdTune, MdLocalHospital,
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
  chopalStatus: { registered: boolean; isOpen: boolean; date: string };
}

// Section keys for visibility toggle
type SectionKey = "quote" | "schedule" | "duty" | "teamSchedule" | "notes" | "tasks" | "forms" | "surveys" | "birthdays" | "messages" | "materials" | "commander" | "vote" | "machines" | "chopal";

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
  const [visible, setVisible] = useState<Set<SectionKey>>(() => loadVisibleSections());
  const [dashStyle, setDashStyle] = useState<"new" | "classic">(() => {
    if (typeof window === "undefined") return "new";
    return (localStorage.getItem("dashboard-style") as "new" | "classic") || "new";
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
    const [machinesRes, feedRes] = await Promise.all([
      fetch("/api/machines"),
      fetch("/api/dashboard"),
    ]);
    if (machinesRes.ok) setMachines(await machinesRes.json());
    if (feedRes.ok) setFeed(await feedRes.json());
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

  // Count urgent items
  const urgentCount = (feed?.pendingForms.length || 0)
    + (feed?.todayTasks.filter(t => t.priority === "urgent" || (t.dueDate && new Date(t.dueDate) < new Date())).length || 0);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header — compact, elegant */}
      <div className="mb-4 flex items-center gap-3">
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
          <div className="flex gap-1.5 mb-3 bg-gray-100 rounded-xl p-1">
            <button onClick={() => { setDashStyle("new"); localStorage.setItem("dashboard-style", "new"); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${dashStyle === "new" ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
              עיצוב חדש
            </button>
            <button onClick={() => { setDashStyle("classic"); localStorage.setItem("dashboard-style", "classic"); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${dashStyle === "classic" ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
              עיצוב קלאסי
            </button>
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
            <Link href="/chopal" className="flex items-center gap-2.5 bg-green-50/60 border border-green-200 rounded-xl px-3 py-2 hover:shadow-sm transition">
              <MdCheckCircle className="text-lg text-green-500 shrink-0" />
              <span className="text-xs font-medium text-green-700 flex-1 truncate">נרשמת לחופ&quot;ל למחר ✓</span>
            </Link>
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

          {/* Schedule glance — redesigned with timeline feel */}
          {visible.has("schedule") && (feed.currentSchedule || feed.allDaySchedule.length > 0) && (
            <Link href="/schedule-daily" className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="bg-gradient-to-l from-emerald-500 to-dotan-green px-3.5 py-2 flex items-center gap-2">
                <MdCalendarMonth className="text-sm text-white/90" />
                <span className="text-[11px] font-bold text-white/90">לו&quot;ז היום</span>
              </div>
              <div className="px-3.5 py-2.5">
                {feed.currentSchedule && (() => {
                  const cs = feed.currentSchedule;
                  const isNow = cs.status === "now";
                  return (
                    <div className="flex items-center gap-2.5">
                      {isNow ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0 ring-4 ring-green-100" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate block">{cs.title}</span>
                        <span className="text-[11px] text-gray-400 tabular-nums" dir="ltr">
                          {new Date(cs.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                          {" – "}
                          {new Date(cs.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                        </span>
                      </div>
                      {isNow && <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">עכשיו</span>}
                      {cs.assignees?.length > 0 && <span className="text-[8px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">עבורך</span>}
                    </div>
                  );
                })()}
                {feed.allDaySchedule.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-50">
                    {feed.allDaySchedule.map((e) => (
                      <span key={e.id} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
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
            if (visible.has("chopal") && feed.chopalStatus?.registered)
              actionItems.push({ key: "chopal-done", href: "/chopal", icon: MdCheckCircle, iconColor: "text-green-500", bg: "from-green-50 to-emerald-50", border: "border-green-100", textColor: "text-green-700", label: 'נרשמת לחופ"ל ✓' });
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
