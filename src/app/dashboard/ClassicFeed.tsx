"use client";

import Link from "next/link";
import {
  MdCalendarMonth, MdCheckCircle, MdWarning, MdSchedule,
  MdAssignment, MdStar, MdDescription, MdPoll, MdCake,
  MdMessage, MdNewReleases, MdSecurity, MdLocalHospital,
  MdAccessTime, MdVolunteerActivism, MdMoreHoriz,
} from "react-icons/md";
import { useEffect } from "react";
import type { DashboardFeed, SectionKey } from "./types";
import { CAT_ICONS, CAT_COLORS } from "./types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface ClassicFeedProps {
  feed: DashboardFeed;
  visible: Set<SectionKey>;
}

export default function ClassicFeed({ feed, visible }: ClassicFeedProps) {
  const { t, locale, dateLocale } = useLanguage();  return (
    <div className="space-y-2 mb-5">
      {visible.has("quote") && feed.dailyQuote && (
        <Link href="/daily-quote" className="block bg-gradient-to-l from-purple-50/80 to-indigo-50/80 border border-purple-100 rounded-xl px-3.5 py-3 hover:shadow-sm transition">
          <p className="text-[13px] font-medium text-gray-700 leading-relaxed">&ldquo;{feed.dailyQuote.text}&rdquo;</p>
          <span className="text-[10px] text-purple-400 mt-1 block">{displayName(feed.dailyQuote.user, locale)} — {t.dashboard.dailyQuote}</span>
        </Link>
      )}
      {visible.has("schedule") && (feed.currentSchedule || feed.allDaySchedule.length > 0) && (
        <Link href="/schedule-daily" className="block bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm transition">
          <div className="flex items-center gap-2 mb-1">
            <MdCalendarMonth className="text-sm text-dotan-green" />
            <span className="text-[10px] font-bold text-gray-400 tracking-wide">{t.dashboard.dailySchedule}</span>
          </div>
          {feed.currentSchedule && (() => {
            const cs = feed.currentSchedule;
            return (
              <div className="flex items-center gap-2">
                {cs.status === "now" && <span className="w-1.5 h-1.5 rounded-full bg-dotan-green animate-pulse shrink-0" />}
                <span className="text-sm font-medium text-gray-800 truncate">{cs.title}</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 ${cs.target === "all" ? "bg-emerald-50 text-emerald-600" : "bg-cyan-50 text-cyan-600"}`}>
                  {cs.target === "all" ? t.schedule.platoon : t.common.team}
                </span>
                <span className="text-[11px] text-gray-400 shrink-0 tabular-nums" dir="ltr">
                  {new Date(cs.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}–{new Date(cs.endTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
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
            ) : <span className="text-[10px] text-gray-400 block">{t.guardDuty.noAssignment}</span>}
          </div>
        </Link>
      ))}
      {visible.has("teamSchedule") && feed.myTeamAssignments?.length > 0 && (
        <Link href="/schedule-daily" className="flex items-center gap-2.5 bg-teal-50/60 border border-teal-100 rounded-xl px-3 py-2.5 hover:shadow-sm transition">
          <MdCalendarMonth className="text-lg text-teal-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-teal-700">{t.dashboard.sectionTeamSchedule}</span>
              <span className="text-[8px] bg-teal-500 text-white px-1 rounded font-bold">{t.schedule.forYou}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {feed.myTeamAssignments.map((e) => (
                <span key={e.id} className="text-[11px] text-teal-800">
                  <span className="font-bold tabular-nums" dir="ltr">
                    {e.allDay ? t.common.allDay : new Date(e.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}
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
          <span className="text-xs font-medium text-amber-700 flex-1 truncate">{feed.pendingForms.length} {t.dashboard.forms}</span>
        </Link>
      )}
      {visible.has("chopal") && feed.chopalStatus?.isOpen && !feed.chopalStatus?.registered && (
        <Link href="/chopal" className="flex items-center gap-2.5 bg-rose-50/60 border border-rose-200 rounded-xl px-3 py-2 hover:shadow-sm transition">
          <MdLocalHospital className="text-lg text-rose-500 shrink-0" />
          <span className="text-xs font-medium text-rose-700 flex-1 truncate">{t.dashboard.chopal} — {t.chopal.iNeedChopal}</span>
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
                {t.dashboard.chopal} — {feed.chopalStatus.assignment.assignedTime}
                {feed.chopalStatus.assignment.status === "pending" && ` (${t.chopal.waitingForAppointment})`}
                {feed.chopalStatus.assignment.status === "accepted" && " ✓"}
                {feed.chopalStatus.assignment.status === "rejected" && ` (${t.chopal.appointmentRejected})`}
              </span>
            </>
          ) : (
            <>
              <MdCheckCircle className="text-lg text-green-500 shrink-0" />
              <span className="text-xs font-medium text-green-700 flex-1 truncate">{t.chopal.registeredForChopal} — {t.chopal.waitingForAppointment}</span>
            </>
          )}
        </Link>
      )}
      {visible.has("volunteers") && feed.urgentReplacement && (
        <Link href={`/volunteers?highlight=${feed.urgentReplacement.request.id}`} className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:shadow-sm transition animate-pulse">
          <MdVolunteerActivism className="text-lg text-red-500 shrink-0" />
          <span className="text-xs font-bold text-red-700 flex-1 truncate flex items-center gap-1"><MdWarning className="text-sm shrink-0" /> {t.volAlerts.needsReplacement} {t.volAlerts.urgent} — {feed.urgentReplacement.request.title}</span>
        </Link>
      )}
      {visible.has("volunteers") && feed.activeVolunteerRequests?.length > 0 && (
        <div className="bg-white border border-green-200 rounded-xl px-3.5 py-2.5">
          <Link href="/volunteers" className="flex items-center gap-2 mb-1.5">
            <MdVolunteerActivism className="text-sm text-green-500" />
            <span className="text-[10px] font-bold text-gray-400">{t.volunteers.title} ({feed.activeVolunteerRequests.length})</span>
          </Link>
          <div className="space-y-1.5">
            {feed.activeVolunteerRequests.slice(0, 3).map((r) => {
              const CatIcon = CAT_ICONS[r.category] || MdMoreHoriz;
              const filled = r._count.assignments;
              const start = new Date(r.startTime);
              const timeStr = start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
              return (
                <Link key={r.id} href="/volunteers" className={`flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition ${r.priority === "urgent" ? "bg-red-50 border border-red-100" : ""}`}>
                  <CatIcon className={`text-sm shrink-0 ${CAT_COLORS[r.category] || "text-gray-400"}`} />
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
            <span className="text-[10px] font-bold text-gray-400">{t.volunteers.myTab} ({feed.myVolunteerAssignments.length})</span>
          </Link>
          <div className="space-y-1.5">
            {feed.myVolunteerAssignments.slice(0, 3).map((a) => {
              const CatIcon = CAT_ICONS[a.request.category] || MdMoreHoriz;
              const start = new Date(a.request.startTime);
              const end = new Date(a.request.endTime);
              const timeStr = `${start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}–${end.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}`;
              const isNow = new Date() >= start && new Date() <= end;
              return (
                <Link key={a.id} href="/volunteers?tab=my" className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${isNow ? "bg-emerald-50 border border-emerald-100" : "hover:bg-gray-50"}`}>
                  <CatIcon className={`text-sm shrink-0 ${CAT_COLORS[a.request.category] || "text-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isNow ? "text-emerald-700" : "text-gray-700"}`}>{a.request.title}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <MdAccessTime className="text-[10px]" /> {timeStr}
                      {isNow && <span className="text-emerald-500 font-bold me-1 flex items-center gap-0.5"><MdSchedule className="text-[10px]" />{t.common.now}</span>}
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
            <span className="text-[10px] font-bold text-gray-400">{t.dashboard.volunteers} ({feed.myCreatedRequests.length})</span>
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
          <span className="text-xs font-medium text-violet-700 flex-1 truncate">{(feed.pendingSurveys?.length || 0) + (feed.pendingPlatoonSurveys?.length || 0)} {t.dashboard.surveys}</span>
        </Link>
      )}
      {visible.has("tasks") && feed.todayTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5">
          <Link href="/tasks" className="flex items-center gap-2 mb-1.5">
            <MdAssignment className="text-sm text-purple-500" />
            <span className="text-[10px] font-bold text-gray-400">{t.dashboard.tasks} ({feed.todayTasks.length})</span>
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
          <span className="text-xs font-medium text-pink-700 flex-1 truncate">{t.birthdays.birthdayToday}: {feed.birthdayUsers.map((u) => displayName(u, locale)).join(", ")}</span>
        </Link>
      )}
      {visible.has("materials") && feed.unreadMaterials.length > 0 && (
        <Link href="/materials" className="flex items-center gap-2.5 bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2 hover:shadow-sm transition">
          <MdNewReleases className="text-base text-rose-500 shrink-0" />
          <span className="text-xs font-medium text-rose-700 truncate flex-1">{feed.unreadMaterials.length} {t.dashboard.materials}</span>
        </Link>
      )}
    </div>
  );
}
