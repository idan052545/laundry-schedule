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
  MdNotifications, MdStickyNote2, MdRefresh,
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
  currentSchedule: { id: string; title: string; startTime: string; endTime: string; type: string; status: "now" | "next" } | null;
  allDaySchedule: { id: string; title: string; type: string }[];
  pendingSurveys: { id: string; title: string; createdAt: string }[];
  pendingPlatoonSurveys: { id: string; title: string; createdAt: string }[];
  platoonSurveyCommanderId: string | null;
  hasVotedThisWeek: boolean;
  todayNotes: { id: string; title: string; startTime: string | null; visibility: string; user: { id: string; name: string } }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();
  const currentSlot = `${currentHour.toString().padStart(2, "0")}:00`;

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
    { href: "/schedule-daily", icon: MdCalendarMonth, title: 'לו"ז יומי', desc: "לוח זמנים יומי של הפלוגה", color: "text-sky-600" },
    { href: "/messages", icon: MdMessage, title: "לוח הודעות", desc: "הודעות והתראות לפלוגה", color: "text-blue-600" },
    { href: "/tasks", icon: MdAssignment, title: "לוח משימות", desc: "משימות, דדליינים ותזכורות", color: "text-purple-600" },
    { href: "/forms", icon: MdDescription, title: "טפסים", desc: "קישורים לטפסים שיש למלא", color: "text-indigo-600" },
    { href: "/attendance", icon: MdFactCheck, title: "מצל", desc: "נוכחות לפי צוותים", color: "text-orange-600" },
    { href: "/commander", icon: MdStar, title: "לוח מפקדים", desc: "הודעות ומשימות מהמפקדים", color: "text-amber-600" },
    { href: "/surveys", icon: MdPoll, title: "סקרים", desc: "סקרים לצוות שלך", color: "text-violet-600" },
    { href: "/person-of-week", icon: MdEmojiEvents, title: "איש השבוע", desc: "הצביעו למי שבלט השבוע", color: "text-yellow-600" },
    { href: "/issues", icon: MdBuild, title: "תקלות", desc: "דיווח ומעקב תקלות", color: "text-red-600" },
    { href: "/users-wall", icon: MdPeople, title: "חיילי הפלוגה", desc: "מידע על כל חיילי הפלוגה", color: "text-teal-600" },
    { href: "/materials", icon: MdMenuBook, title: "חומר מקצועי", desc: 'ל"ע, נהלים וחומרי לימוד', color: "text-rose-600" },
    { href: "/formats", icon: MdFolder, title: "פורמטים", desc: "תבניות עבודה ופורמטים", color: "text-cyan-600" },
    { href: "/schedule", icon: MdLocalLaundryService, title: "מכבסה", desc: "קבע תור לכביסה או מייבש", color: "text-dotan-green" },
    { href: "/birthdays", icon: MdCake, title: "ימי הולדת", desc: "קיר ימי הולדת של הפלוגה", color: "text-pink-600" },
    { href: "/aktualia", icon: MdNewspaper, title: "אקטואליה", desc: "נושאי דיון יומי לכל חדר", color: "text-emerald-600" },
    { href: "/notifications", icon: MdNotifications, title: "שליחת התראות", desc: "שלח התראות לפלוגה", color: "text-gray-600" },
    { href: "/profile", icon: MdPerson, title: "פרופיל", desc: "הפרופיל שלי", color: "text-gray-500" },
  ];

  const hasFeedItems = feed && (
    feed.birthdayUsers.length > 0 ||
    feed.pendingForms.length > 0 ||
    feed.todayTasks.length > 0 ||
    feed.pinnedPosts.length > 0 ||
    feed.latestMessage ||
    feed.unreadMaterials.length > 0 ||
    feed.currentSchedule ||
    feed.allDaySchedule.length > 0 ||
    feed.pendingSurveys?.length > 0 ||
    feed.pendingPlatoonSurveys?.length > 0 ||
    feed.hasVotedThisWeek === false ||
    feed.todayNotes?.length > 0
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full shadow overflow-hidden shrink-0">
          <Image src="/dotanLogo.png" alt="דותן" width={56} height={56} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-dotan-green-dark">
            שלום, {session?.user?.name}!
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="p-2.5 rounded-xl bg-white border border-dotan-mint text-dotan-green hover:bg-dotan-mint-light transition shrink-0 disabled:opacity-50">
          <MdRefresh className={`text-xl ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Personalized Feed */}
      {hasFeedItems && (
        <div className="space-y-2 mb-6">
          {/* All-day schedule events */}
          {feed.allDaySchedule.length > 0 && (
            <Link href="/schedule-daily" className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdCalendarMonth className="text-2xl text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-400 block">כל היום</span>
                <span className="text-sm font-medium text-gray-700">
                  {feed.allDaySchedule.map((e) => e.title).join(" | ")}
                </span>
              </div>
            </Link>
          )}

          {/* Current/next timed schedule event */}
          {feed.currentSchedule && (
            <Link href="/schedule-daily" className={`flex items-center gap-3 ${feed.currentSchedule.status === "now" ? "bg-dotan-mint-light border-dotan-green ring-1 ring-dotan-green" : "bg-sky-50 border-sky-200"} border rounded-xl p-3 hover:shadow-sm transition`}>
              <MdCalendarMonth className={`text-2xl shrink-0 ${feed.currentSchedule.status === "now" ? "text-dotan-green animate-pulse" : "text-sky-500"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${feed.currentSchedule.status === "now" ? "text-dotan-green-dark" : "text-sky-700"}`}>
                  {feed.currentSchedule.status === "now" ? "עכשיו: " : "הבא: "}
                  {feed.currentSchedule.title}
                </span>
                <span className={`text-xs block ${feed.currentSchedule.status === "now" ? "text-dotan-green" : "text-sky-500"}`}>
                  {new Date(feed.currentSchedule.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                  {" - "}
                  {new Date(feed.currentSchedule.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
                </span>
              </div>
            </Link>
          )}

          {/* Today's personal/team notes — full list */}
          {feed.todayNotes?.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2">
              <Link href="/schedule-daily" className="flex items-center gap-2 text-sm font-bold text-amber-700">
                <MdStickyNote2 className="text-lg text-amber-500" />
                ההערות שלי להיום
              </Link>
              {feed.todayNotes.map((n) => (
                <div key={n.id} className="flex items-center gap-2.5 bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                  {n.startTime && (
                    <span className="text-[11px] font-bold text-amber-600 shrink-0 tabular-nums" dir="ltr">{n.startTime}</span>
                  )}
                  <span className="text-sm text-gray-800 font-medium truncate">{n.title}</span>
                  {n.visibility === "team" && (
                    <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">צוות</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Birthdays today */}
          {feed.birthdayUsers.length > 0 && (
            <Link href="/birthdays" className="flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdCake className="text-2xl text-pink-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-pink-700">
                  יום הולדת היום: {feed.birthdayUsers.map((u) => u.name).join(", ")}
                </span>
              </div>
              <div className="flex -space-x-1 shrink-0">
                {feed.birthdayUsers.slice(0, 3).map((u) => (
                  <Avatar key={u.id} name={u.name} image={u.image} size="xs" />
                ))}
              </div>
            </Link>
          )}

          {/* Pending forms */}
          {feed.pendingForms.length > 0 && (
            <Link href="/forms" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdWarning className="text-2xl text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-amber-700">
                  {feed.pendingForms.length} טפסים ממתינים למילוי
                </span>
                <span className="text-xs text-amber-500 block truncate">
                  {feed.pendingForms.map((f) => f.title).join(", ")}
                </span>
              </div>
            </Link>
          )}

          {/* Pending team surveys */}
          {feed.pendingSurveys?.length > 0 && (
            <Link href="/surveys" className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdPoll className="text-2xl text-purple-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-purple-700">
                  {feed.pendingSurveys.length} סקרי צוות ממתינים לתשובה
                </span>
                <span className="text-xs text-purple-500 block truncate">
                  {feed.pendingSurveys.map((s) => s.title).join(", ")}
                </span>
              </div>
            </Link>
          )}

          {/* Pending platoon surveys */}
          {feed.pendingPlatoonSurveys?.length > 0 && (
            <Link href={feed.platoonSurveyCommanderId ? `/commander?id=${feed.platoonSurveyCommanderId}` : "/surveys"} className="flex items-center gap-3 bg-violet-50 border border-violet-300 rounded-xl p-3 hover:shadow-sm transition">
              <MdPoll className="text-2xl text-violet-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-violet-700">
                  {feed.pendingPlatoonSurveys.length} סקרי פלוגה ממתינים לתשובה
                </span>
                <span className="text-xs text-violet-500 block truncate">
                  {feed.pendingPlatoonSurveys.map((s) => s.title).join(", ")}
                </span>
              </div>
            </Link>
          )}

          {/* Weekly vote */}
          {feed.hasVotedThisWeek === false && (
            <Link href="/person-of-week" className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-xl p-3 hover:shadow-sm transition">
              <MdEmojiEvents className="text-2xl text-yellow-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-yellow-800">
                  בחרו את איש/אשת השבוע!
                </span>
                <span className="text-xs text-yellow-600 block">
                  עדיין לא הצבעתם השבוע
                </span>
              </div>
            </Link>
          )}

          {/* Today's tasks — with overdue/due soon indicators */}
          {feed.todayTasks.length > 0 && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 space-y-2">
              <Link href="/tasks" className="flex items-center gap-2 text-sm font-bold text-purple-700">
                <MdAssignment className="text-lg text-purple-500" />
                המשימות שלי ({feed.todayTasks.length})
              </Link>
              {feed.todayTasks.map((t) => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                return (
                  <Link key={t.id} href="/tasks"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border text-xs transition hover:shadow-sm ${
                      isOverdue ? "bg-red-50 border-red-200" : "bg-white/70 border-purple-100"
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-400" : "bg-dotan-green"
                    }`} />
                    <span className={`font-medium truncate flex-1 ${isOverdue ? "text-red-700" : "text-gray-800"}`}>{t.title}</span>
                    {t.dueDate && (
                      <span className={`text-[10px] font-bold shrink-0 ${isOverdue ? "text-red-500" : "text-purple-500"}`}>
                        {isOverdue ? "באיחור!" : `יעד: ${new Date(t.dueDate).toLocaleDateString("he-IL",{day:"numeric",month:"short"})}`}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pinned commander posts */}
          {feed.pinnedPosts.length > 0 && feed.pinnedPosts.map((post) => (
            <Link key={post.id} href="/commander" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdPushPin className="text-2xl text-yellow-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-yellow-800 truncate block">{post.title}</span>
                <span className="text-xs text-yellow-600">
                  {post.author.name}
                  {post.dueDate && (
                    <> | <MdSchedule className="inline text-xs" /> {new Date(post.dueDate + "T12:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</>
                  )}
                </span>
              </div>
            </Link>
          ))}

          {/* Latest message */}
          {feed.latestMessage && (
            <Link href="/messages" className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdMessage className="text-2xl text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-blue-700 truncate block">{feed.latestMessage.title}</span>
                <span className="text-xs text-blue-500">{feed.latestMessage.author.name} | {new Date(feed.latestMessage.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
              </div>
            </Link>
          )}

          {/* Unread materials */}
          {feed.unreadMaterials.length > 0 && (
            <Link href="/materials" className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-3 hover:shadow-sm transition">
              <MdNewReleases className="text-2xl text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-rose-700">
                  {feed.unreadMaterials.length} חומרים מקצועיים שלא נקראו
                </span>
                <span className="text-xs text-rose-500 block truncate">
                  {feed.unreadMaterials.map((m) => m.title).join(", ")}
                </span>
              </div>
            </Link>
          )}
        </div>
      )}

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
