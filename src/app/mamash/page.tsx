"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MdCalendarMonth, MdGridView, MdChecklist, MdHistory, MdFlashOn, MdCloudUpload, MdAdd } from "react-icons/md";
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
  const [showCalendarPush, setShowCalendarPush] = useState(false);
  const [calForm, setCalForm] = useState({ title: "", description: "", startTime: "", endTime: "" });
  const [calMsg, setCalMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const myUserId = (session?.user as { id?: string } | undefined)?.id || "";
  const myTeam = (session?.user as { team?: number } | undefined)?.team || null;

  const {
    data, loading, error, acting,
    fetchOverview,
    activateRole, deactivateRole,
    addRequirement, updateRequirement, deleteRequirement,
    doBaltam,
    pushToCalendar,
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

      {/* FABs */}
      {data && data.activeMamash?.userId === myUserId && (
        <div className="fixed bottom-20 left-4 flex flex-col gap-2 z-20">
          {/* Baltam */}
          <button
            onClick={() => {
              const now = new Date();
              const next = data.events
                .filter(e => !e.allDay && e.target !== "all" && new Date(e.endTime) > now)
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
              if (next) setBaltamEvent(next);
            }}
            className="w-12 h-12 bg-amber-500 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-amber-600 transition"
            title={t.mamash.baltamTitle}
          >
            <MdFlashOn className="text-xl" />
          </button>
          {/* Push to Calendar */}
          <button
            onClick={() => { setShowCalendarPush(true); setCalMsg(null); }}
            className="w-12 h-12 bg-blue-500 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-blue-600 transition"
            title={t.mamash.pushToCalendar}
          >
            <MdCloudUpload className="text-xl" />
          </button>
        </div>
      )}

      {/* Push to Calendar modal */}
      {showCalendarPush && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowCalendarPush(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MdCloudUpload className="text-blue-500" /> {t.mamash.pushToCalendar}
            </h3>
            <p className="text-[10px] text-gray-500 mb-3">{t.mamash.pushToCalendarDesc}</p>

            {calMsg && (
              <div className={`rounded-lg px-3 py-2 mb-3 text-xs ${calMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {calMsg.text}
              </div>
            )}

            <label className="block mb-3">
              <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reqTitle}</span>
              <input value={calForm.title} onChange={e => setCalForm(f => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="שיחת סטטוס — נטע" />
            </label>
            <label className="block mb-3">
              <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
              <input value={calForm.description} onChange={e => setCalForm(f => ({ ...f, description: e.target.value }))}
                className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="תיאור (אופציונלי)" />
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newStart}</span>
                <input type="time" value={calForm.startTime} onChange={e => setCalForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </label>
              <label>
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.newEnd}</span>
                <input type="time" value={calForm.endTime} onChange={e => setCalForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </label>
            </div>

            <button
              onClick={async () => {
                if (!calForm.title || !calForm.startTime || !calForm.endTime) {
                  setCalMsg({ type: "error", text: "מלא כותרת ושעות" });
                  return;
                }
                const startISO = `${date}T${calForm.startTime}:00+03:00`;
                const endISO = `${date}T${calForm.endTime}:00+03:00`;
                const result = await pushToCalendar({
                  title: calForm.title,
                  description: calForm.description || undefined,
                  startTime: startISO,
                  endTime: endISO,
                });
                if (result.ok) {
                  setCalMsg({ type: "ok", text: "נוסף ליומן Google בהצלחה!" });
                  setCalForm({ title: "", description: "", startTime: "", endTime: "" });
                } else if (result.needsSetup) {
                  setCalMsg({ type: "error", text: "יש להגדיר Service Account — ראה הוראות בתיעוד" });
                } else {
                  setCalMsg({ type: "error", text: result.error || "שגיאה" });
                }
              }}
              disabled={acting}
              className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <MdAdd className="text-sm" /> {t.mamash.pushToCalendar}
            </button>
          </div>
        </div>
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
