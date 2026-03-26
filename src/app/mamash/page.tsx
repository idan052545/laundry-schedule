"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MdCalendarMonth, MdGridView, MdChecklist, MdHistory, MdFlashOn } from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { useMamash } from "./useMamash";
import DayHeader from "./DayHeader";
import TimelinePanel from "./TimelinePanel";
import AvailabilityMatrix from "./AvailabilityMatrix";
import RequirementsPanel from "./RequirementsPanel";
import ChangelogDrawer from "./ChangelogDrawer";
import BaltamSheet from "./BaltamSheet";
import type { ScheduleEvent } from "./types";

type Tab = "timeline" | "availability" | "requirements" | "changelog";

export default function MamashPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [baltamEvent, setBaltamEvent] = useState<ScheduleEvent | null>(null);

  const myUserId = (session?.user as { id?: string } | undefined)?.id || "";
  const myTeam = (session?.user as { team?: number } | undefined)?.team || null;

  const {
    data, loading, error, acting,
    fetchOverview,
    activateRole, deactivateRole,
    addRequirement, updateRequirement, deleteRequirement,
    doBaltam,
  } = useMamash(date, myTeam);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading" || !session) return <InlineLoading />;

  if (!myTeam) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-500 text-sm">{t.mamash.noTeam}</p>
      </div>
    );
  }

  const tabs: { key: Tab; icon: typeof MdCalendarMonth; label: string; badge?: number }[] = [
    { key: "timeline", icon: MdCalendarMonth, label: t.mamash.tabTimeline },
    { key: "availability", icon: MdGridView, label: t.mamash.tabAvailability },
    {
      key: "requirements",
      icon: MdChecklist,
      label: t.mamash.tabRequirements,
      badge: data?.requirements.filter(r => r.status === "pending").length || 0,
    },
    {
      key: "changelog",
      icon: MdHistory,
      label: t.mamash.tabChanges,
      badge: data?.changelog.length || 0,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <DayHeader
        date={date}
        setDate={setDate}
        team={myTeam}
        data={data}
        myUserId={myUserId}
        onActivate={activateRole}
        onDeactivate={deactivateRole}
        onRefresh={fetchOverview}
        acting={acting}
      />

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <div className="p-6"><InlineLoading /></div>}

      {/* Content */}
      {!loading && data && (
        <>
          {activeTab === "timeline" && (
            <TimelinePanel
              events={data.events}
              freeSlots={data.freeSlots}
              team={myTeam}
              date={date}
              onEventAction={setBaltamEvent}
            />
          )}
          {activeTab === "availability" && (
            <AvailabilityMatrix availability={data.availability} />
          )}
          {activeTab === "requirements" && (
            <RequirementsPanel
              requirements={data.requirements}
              teamMembers={data.teamMembers}
              onAdd={addRequirement}
              onUpdate={updateRequirement}
              onDelete={deleteRequirement}
              acting={acting}
            />
          )}
          {activeTab === "changelog" && (
            <ChangelogDrawer changelog={data.changelog} />
          )}
        </>
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => setActiveTab(tb.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition ${
                activeTab === tb.key ? "text-dotan-green" : "text-gray-400"
              }`}
            >
              <div className="relative">
                <tb.icon className="text-lg" />
                {(tb.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center px-0.5">
                    {tb.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold">{tb.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FAB - Baltam quick action */}
      {data && data.activeMamash?.userId === myUserId && (
        <button
          onClick={() => {
            // Open baltam for the next upcoming event
            const now = new Date();
            const next = data.events
              .filter(e => !e.allDay && e.target !== "all" && new Date(e.endTime) > now)
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
            if (next) setBaltamEvent(next);
          }}
          className="fixed bottom-20 left-4 w-12 h-12 bg-amber-500 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-amber-600 transition z-20"
        >
          <MdFlashOn className="text-xl" />
        </button>
      )}

      {/* Baltam bottom sheet */}
      {baltamEvent && data && (
        <BaltamSheet
          event={baltamEvent}
          teamMembers={data.teamMembers}
          allEvents={data.events}
          date={date}
          onClose={() => setBaltamEvent(null)}
          onAction={doBaltam}
          acting={acting}
        />
      )}
    </div>
  );
}
