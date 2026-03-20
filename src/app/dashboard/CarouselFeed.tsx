"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  MdCalendarMonth, MdCheckCircle, MdAssignment, MdDescription,
  MdPoll, MdCake, MdMessage, MdNewReleases, MdSecurity,
  MdLocalHospital, MdAccessTime, MdPushPin, MdStickyNote2,
  MdAutoAwesome, MdEmojiEvents, MdVolunteerActivism,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import type { DashboardFeed, SectionKey } from "./types";
import { useLanguage } from "@/i18n";

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

interface CarouselFeedProps {
  feed: DashboardFeed;
  visible: Set<SectionKey>;
}

export default function CarouselFeed({ feed, visible }: CarouselFeedProps) {
  const { t, dateLocale } = useLanguage();
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
      title: t.dashboard.dailyQuote,
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
      title: t.dashboard.dailySchedule,
      subtitle: hasNow ? t.common.now : undefined,
      content: (
        <div className="mt-2 space-y-1">
          {(feed.scheduleItems || []).slice(0, 4).map(ev => (
            <div key={ev.id} className={`flex items-center gap-2 ${ev.status !== "now" ? "opacity-60" : ""}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.status === "now" ? "bg-white animate-pulse" : "bg-white/40"}`} />
              <span className="text-[10px] text-white/70 tabular-nums shrink-0" dir="ltr">
                {new Date(ev.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
              </span>
              <span className="text-xs text-white truncate">{ev.title}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 ${ev.target === "all" ? "bg-white/15 text-white/80" : "bg-cyan-300/25 text-cyan-100"}`}>
                {ev.target === "all" ? t.schedule.platoon : t.common.team}
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
        subtitle: new Date(dt.date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" }),
        content: dt.myAssignments.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {dt.myAssignments.map((a, i) => (
              <span key={i} className="text-[10px] bg-white/20 text-white px-2 py-1 rounded-lg font-medium">
                {a.role} · {a.timeSlot}
              </span>
            ))}
          </div>
        ) : <p className="text-white/60 text-xs mt-2">{t.guardDuty.noAssignment}</p>,
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
      title: `${t.dashboard.sectionTeamSchedule} — ${t.schedule.forYou}`,
      subtitle: `${feed.myTeamAssignments.length} ${t.dashboard.tasks}`,
      content: (
        <div className="space-y-1 mt-2">
          {feed.myTeamAssignments.slice(0, 3).map(e => (
            <div key={e.id} className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
              <span className="text-[11px] font-bold text-white/80 tabular-nums w-12 text-center" dir="ltr">
                {e.allDay ? t.common.allDay : new Date(e.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
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
      title: `${feed.todayTasks.length} ${t.dashboard.tasks}`,
      content: (
        <div className="space-y-1 mt-2">
          {feed.todayTasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.priority === "urgent" ? "bg-red-300" : task.priority === "high" ? "bg-orange-300" : "bg-white/40"}`} />
              <span className="text-xs text-white/90 truncate">{task.title}</span>
            </div>
          ))}
          {feed.todayTasks.length > 3 && <span className="text-[10px] text-white/50">+ {feed.todayTasks.length - 3}</span>}
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
      title: `${feed.pendingForms.length} ${t.dashboard.forms}`,
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
      title: t.dashboard.chopal,
      subtitle: t.chopal.iNeedChopal,
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
      title: ca ? `${t.dashboard.chopal} — ${ca.assignedTime}` : t.chopal.registeredForChopal,
      subtitle: ca?.status === "pending" ? t.chopal.waitingForAppointment : ca?.status === "accepted" ? `${t.chopal.appointmentApproved} ✓` : ca?.status === "rejected" ? t.chopal.appointmentRejected : t.chopal.waitingForAppointment,
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
      title: `${t.volAlerts.needsReplacement} ${t.volAlerts.urgent}!`,
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
      title: `${feed.activeVolunteerRequests.length} ${t.volunteers.title}`,
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
      title: nowV ? nowV.request.title : `${feed.myVolunteerAssignments.length} ${t.volunteers.title}`,
      subtitle: nowV ? `${t.common.now}` : feed.myVolunteerAssignments[0]?.request.title,
    });
  }
  if (visible.has("volunteers") && feed.myCreatedRequests?.length > 0) {
    cards.push({
      key: "vol-created",
      href: "/volunteers",
      gradient: "from-teal-500 to-cyan-600",
      iconBg: "bg-white/20",
      icon: <MdVolunteerActivism className="text-xl text-white" />,
      title: `${feed.myCreatedRequests.length} ${t.dashboard.volunteers}`,
      subtitle: `${feed.myCreatedRequests.reduce((s, r) => s + r._count.assignments, 0)} ${t.volunteers.volunteersCount}`,
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
      title: `${total} ${t.dashboard.surveys}`,
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
      title: `${t.birthdays.birthdayToday}!`,
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
      title: `${t.personOfWeek.vote} ${t.personOfWeek.title}!`,
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
      title: `${feed.unreadMaterials.length} ${t.dashboard.materials}`,
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
      title: `${feed.todayNotes.length} ${t.dashboard.sectionNotes}`,
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
