"use client";

import Link from "next/link";
import {
  MdCheckCircle, MdDescription, MdPoll, MdNewReleases,
  MdLocalHospital, MdAccessTime, MdStickyNote2,
  MdEmojiEvents, MdVolunteerActivism,
} from "react-icons/md";
import type { DashboardFeed, SectionKey } from "../types";
import { useLanguage } from "@/i18n";

interface ActionItemsGridProps {
  feed: DashboardFeed;
  visible: Set<SectionKey>;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function ActionItemsGrid({ feed, visible, t }: ActionItemsGridProps) {
  const actionItems: { key: string; href: string; icon: typeof MdDescription; iconColor: string; bg: string; border: string; textColor: string; label: string }[] = [];

  if (visible.has("notes") && feed.todayNotes?.length > 0)
    actionItems.push({ key: "notes", href: "/schedule-daily", icon: MdStickyNote2, iconColor: "text-amber-500", bg: "from-amber-50 to-orange-50", border: "border-amber-100", textColor: "text-amber-700", label: `${feed.todayNotes.length} ${t.dashboard.sectionNotes}` });
  if (visible.has("forms") && feed.pendingForms.length > 0)
    actionItems.push({ key: "forms", href: "/forms", icon: MdDescription, iconColor: "text-orange-500", bg: "from-orange-50 to-amber-50", border: "border-orange-100", textColor: "text-orange-700", label: `${feed.pendingForms.length} ${t.dashboard.forms}` });
  if (visible.has("chopal") && feed.chopalStatus?.isOpen && !feed.chopalStatus?.registered)
    actionItems.push({ key: "chopal", href: "/chopal", icon: MdLocalHospital, iconColor: "text-rose-500", bg: "from-rose-50 to-pink-50", border: "border-rose-100", textColor: "text-rose-700", label: `${t.dashboard.chopal} — ${t.chopal.iNeedChopal}` });
  if (visible.has("chopal") && feed.chopalStatus?.registered) {
    const ca = feed.chopalStatus.assignment;
    const chopalLabel = ca
      ? ca.status === "pending" ? `${t.dashboard.chopal} ${ca.assignedTime} — ${t.chopal.approve}` : ca.status === "accepted" ? `${t.dashboard.chopal} ${ca.assignedTime} ✓` : `${t.dashboard.chopal} — ${t.chopal.appointmentRejected}`
      : `${t.chopal.registeredForChopal} — ${t.chopal.waitingForAppointment}`;
    const chopalIcon = ca?.status === "pending" ? MdAccessTime : MdCheckCircle;
    const chopalColor = ca?.status === "pending" ? "text-amber-500" : "text-green-500";
    const chopalBg = ca?.status === "pending" ? "from-amber-50 to-orange-50" : "from-green-50 to-emerald-50";
    const chopalBorder = ca?.status === "pending" ? "border-amber-100" : "border-green-100";
    const chopalText = ca?.status === "pending" ? "text-amber-700" : "text-green-700";
    actionItems.push({ key: "chopal-done", href: "/chopal", icon: chopalIcon, iconColor: chopalColor, bg: chopalBg, border: chopalBorder, textColor: chopalText, label: chopalLabel });
  }
  if (visible.has("volunteers") && feed.urgentReplacement)
    actionItems.push({ key: "vol-urgent", href: `/volunteers?highlight=${feed.urgentReplacement.request.id}`, icon: MdVolunteerActivism, iconColor: "text-red-500", bg: "from-red-50 to-rose-50", border: "border-red-200", textColor: "text-red-700", label: `${t.volAlerts.needsReplacement} ${feed.urgentReplacement.request.title}` });
  if (visible.has("volunteers") && feed.activeVolunteerRequests?.length > 0)
    actionItems.push({ key: "vol-active", href: "/volunteers", icon: MdVolunteerActivism, iconColor: "text-green-500", bg: "from-green-50 to-emerald-50", border: "border-green-100", textColor: "text-green-700", label: `${feed.activeVolunteerRequests.length} ${t.volunteers.title}` });
  if (visible.has("volunteers") && feed.myVolunteerAssignments?.length > 0 && !feed.myVolunteerAssignments.some(a => (a.overlappingSchedule?.length ?? 0) > 0 || (a.request.assignments?.length ?? 0) > 1)) {
    const nowVol = feed.myVolunteerAssignments.find(a => { const s = new Date(a.request.startTime); const e = new Date(a.request.endTime); const n = new Date(); return n >= s && n <= e; });
    const volLabel = nowVol ? `${nowVol.request.title} — ${t.common.now}` : `${feed.myVolunteerAssignments.length} ${t.volunteers.title}`;
    actionItems.push({ key: "vol-my", href: "/volunteers?tab=my", icon: MdCheckCircle, iconColor: nowVol ? "text-emerald-600" : "text-emerald-500", bg: nowVol ? "from-emerald-100 to-green-100" : "from-emerald-50 to-green-50", border: nowVol ? "border-emerald-300" : "border-emerald-100", textColor: nowVol ? "text-emerald-800" : "text-emerald-700", label: volLabel });
  }
  if (visible.has("surveys") && (feed.pendingSurveys?.length > 0 || feed.pendingPlatoonSurveys?.length > 0))
    actionItems.push({ key: "surveys", href: "/surveys", icon: MdPoll, iconColor: "text-violet-500", bg: "from-violet-50 to-purple-50", border: "border-violet-100", textColor: "text-violet-700", label: `${(feed.pendingSurveys?.length || 0) + (feed.pendingPlatoonSurveys?.length || 0)} ${t.dashboard.surveys}` });
  if (visible.has("vote") && feed.hasVotedThisWeek === false)
    actionItems.push({ key: "vote", href: "/person-of-week", icon: MdEmojiEvents, iconColor: "text-yellow-500", bg: "from-yellow-50 to-amber-50", border: "border-yellow-100", textColor: "text-yellow-700", label: `${t.personOfWeek.vote} ${t.personOfWeek.title}!` });
  if (visible.has("materials") && feed.unreadMaterials.length > 0)
    actionItems.push({ key: "materials", href: "/materials", icon: MdNewReleases, iconColor: "text-rose-500", bg: "from-rose-50 to-red-50", border: "border-rose-100", textColor: "text-rose-700", label: `${feed.unreadMaterials.length} ${t.dashboard.materials}` });

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
}
