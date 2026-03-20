"use client";

import Link from "next/link";
import {
  MdCalendarMonth, MdCheckCircle, MdAssignment, MdDescription,
  MdPoll, MdCake, MdMessage, MdNewReleases, MdSecurity,
  MdLocalHospital, MdAccessTime, MdPushPin, MdStickyNote2,
  MdAutoAwesome, MdEmojiEvents, MdVolunteerActivism,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import type { DashboardFeed, SectionKey } from "./types";

interface NewFeedProps {
  feed: DashboardFeed;
  visible: Set<SectionKey>;
}

export default function NewFeed({ feed, visible }: NewFeedProps) {
  return (
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
  );
}
