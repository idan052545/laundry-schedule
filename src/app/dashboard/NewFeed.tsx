"use client";

import { useEffect } from "react";
import { useTranslation } from "@/components/TranslateButton";
import type { DashboardFeed, SectionKey } from "./types";
import { useLanguage } from "@/i18n";

import DailyQuoteSection from "./feed/DailyQuoteSection";
import ScheduleSection from "./feed/ScheduleSection";
import DutyTablesSection from "./feed/DutyTablesSection";
import TeamScheduleSection from "./feed/TeamScheduleSection";
import MyScheduleSection from "./feed/MyScheduleSection";
import VolunteerAssignmentsSection from "./feed/VolunteerAssignmentsSection";
import CreatedRequestsSection from "./feed/CreatedRequestsSection";
import QuickAssignCards from "./feed/QuickAssignCards";
import ActionItemsGrid from "./feed/ActionItemsGrid";
import BirthdaysSection from "./feed/BirthdaysSection";
import TasksSection from "./feed/TasksSection";
import CommanderPinnedSection from "./feed/CommanderPinnedSection";
import LatestMessageSection from "./feed/LatestMessageSection";

interface NewFeedProps {
  feed: DashboardFeed;
  visible: Set<SectionKey>;
  onRemindVolunteer?: (requestId: string) => void;
  onQuickAssign?: (requestId: string) => Promise<boolean>;
  isSagal?: boolean;
}

export default function NewFeed({ feed, visible, onRemindVolunteer, onQuickAssign, isSagal }: NewFeedProps) {
  const { t, locale, dateLocale } = useLanguage();
  const { translateTexts, getTranslation, isEnglish } = useTranslation();

  useEffect(() => {
    if (!isEnglish) return;
    const texts: string[] = [];
    if (feed.dailyQuote) texts.push(feed.dailyQuote.text);
    for (const ev of feed.scheduleItems || []) texts.push(ev.title);
    for (const ev of feed.allDaySchedule) texts.push(ev.title);
    for (const ev of feed.myTeamAssignments || []) texts.push(ev.title);
    for (const ev of feed.myAssignedSchedule || []) texts.push(ev.title);
    for (const task of feed.todayTasks) texts.push(task.title);
    for (const f of feed.pendingForms) texts.push(f.title);
    for (const p of feed.pinnedPosts) texts.push(p.title);
    if (feed.latestMessage) texts.push(feed.latestMessage.title);
    for (const r of feed.activeVolunteerRequests || []) texts.push(r.title);
    for (const a of feed.myVolunteerAssignments || []) texts.push(a.request.title);
    for (const r of feed.myCreatedRequests || []) texts.push(r.title);
    if (feed.urgentReplacement) texts.push(feed.urgentReplacement.request.title);
    if (texts.length > 0) translateTexts(texts);
  }, [isEnglish, feed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3 mb-5">
      {visible.has("quote") && feed.dailyQuote && (
        <DailyQuoteSection quote={feed.dailyQuote} locale={locale} getTranslation={getTranslation} />
      )}

      {visible.has("schedule") && ((feed.scheduleItems?.length > 0) || feed.allDaySchedule.length > 0) && (
        <ScheduleSection scheduleItems={feed.scheduleItems} allDaySchedule={feed.allDaySchedule} dateLocale={dateLocale} t={t} getTranslation={getTranslation} />
      )}

      {visible.has("duty") && feed.nextDutyTables?.length > 0 && (
        <DutyTablesSection dutyTables={feed.nextDutyTables} dateLocale={dateLocale} t={t} />
      )}

      {visible.has("teamSchedule") && feed.myTeamAssignments?.length > 0 && (
        <TeamScheduleSection myTeamAssignments={feed.myTeamAssignments} dateLocale={dateLocale} t={t} getTranslation={getTranslation} />
      )}

      {visible.has("mySchedule") && (
        <MyScheduleSection myAssignedSchedule={feed.myAssignedSchedule} myTeamAssignments={feed.myTeamAssignments} dateLocale={dateLocale} t={t} getTranslation={getTranslation} />
      )}

      {visible.has("volunteers") && feed.myVolunteerAssignments?.some(a => (a.overlappingSchedule?.length ?? 0) > 0 || (a.request.assignments?.length ?? 0) > 1) && (
        <VolunteerAssignmentsSection myVolunteerAssignments={feed.myVolunteerAssignments} dateLocale={dateLocale} locale={locale} t={t} />
      )}

      {visible.has("volunteers") && feed.myCreatedRequests?.length > 0 && (
        <CreatedRequestsSection myCreatedRequests={feed.myCreatedRequests} locale={locale} dateLocale={dateLocale} t={t} onRemindVolunteer={onRemindVolunteer} />
      )}

      {visible.has("volunteers") && !isSagal && onQuickAssign && feed.activeVolunteerRequests?.length > 0 && (() => {
        const assignable = feed.activeVolunteerRequests.filter(r => {
          const isFull = (r._count?.assignments ?? 0) >= r.requiredCount;
          const isMine = feed.myVolunteerAssignments?.some(a => a.request.id === r.id);
          return !isFull && !isMine && r.status === "open";
        });
        if (assignable.length === 0) return null;
        return <QuickAssignCards requests={assignable} onQuickAssign={onQuickAssign} dateLocale={dateLocale} t={t} getTranslation={getTranslation} />;
      })()}

      <ActionItemsGrid feed={feed} visible={visible} t={t} />

      {visible.has("birthdays") && feed.birthdayUsers.length > 0 && (
        <BirthdaysSection birthdayUsers={feed.birthdayUsers} locale={locale} t={t} />
      )}

      {visible.has("tasks") && feed.todayTasks.length > 0 && (
        <TasksSection todayTasks={feed.todayTasks} t={t} getTranslation={getTranslation} />
      )}

      {visible.has("commander") && feed.pinnedPosts.length > 0 && (
        <CommanderPinnedSection pinnedPosts={feed.pinnedPosts} locale={locale} dateLocale={dateLocale} t={t} getTranslation={getTranslation} />
      )}

      {visible.has("messages") && feed.latestMessage && (
        <LatestMessageSection latestMessage={feed.latestMessage} locale={locale} t={t} getTranslation={getTranslation} />
      )}
    </div>
  );
}
