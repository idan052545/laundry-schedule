"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { MdCalendarMonth, MdStickyNote2, MdMyLocation } from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { ScheduleEvent, EventFormData } from "./types";
import EventForm from "./EventForm";
import EventDetailModal from "./EventDetailModal";
import AssignModal from "./AssignModal";
import DateNavigation from "./DateNavigation";
import TypeFilter from "./TypeFilter";
import AdminToolbar from "./AdminToolbar";
import SyncDiffPanel from "./SyncDiffPanel";
import AllDayEvents from "./AllDayEvents";
import NoteForm from "./NoteForm";
import Timeline from "./Timeline";
import { useScheduleEvents } from "./useScheduleEvents";
import { useScheduleNotes } from "./useScheduleNotes";

export default function ScheduleDailyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<ScheduleEvent | null>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<EventFormData>({
    title: "", description: "", startTime: "", endTime: "",
    allDay: false, target: "all", type: "general",
  });

  const ev = useScheduleEvents(status, date, typeFilter);
  const nt = useScheduleNotes(date);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      Promise.all([ev.fetchEvents(), nt.fetchNotes()]);
      ev.loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, date, typeFilter, ev.fetchEvents, nt.fetchNotes]);

  // Refetch when admin toggles team visibility
  const visibleTeamsKey = Array.from(ev.visibleTeams).sort().join(",");
  useEffect(() => {
    if (ev.initialLoadDone.current && (ev.isAdmin || isSagal)) {
      ev.fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTeamsKey]);

  const myUserId = (session?.user as { id?: string })?.id;
  const myName = session?.user?.name || "";
  const myRole = (session?.user as { role?: string } | undefined)?.role;
  const isSagal = myRole === "sagal";
  const canEdit = ev.isAdmin && !isSagal;

  const isToday = date === new Date().toISOString().split("T")[0];

  const filteredEvents = targetFilter === "all"
    ? ev.events
    : targetFilter === "platoon"
      ? ev.events.filter((e) => e.target === "all")
      : ev.events.filter((e) => e.target !== "all");

  const allDayEvents = filteredEvents.filter((e) => e.allDay);
  const timedEvents = filteredEvents.filter((e) => !e.allDay);

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const resetForm = () => {
    setForm({ title: "", description: "", startTime: "", endTime: "", allDay: false, target: "all", type: "general" });
    ev.setFormUserIds([]);
  };

  const openEdit = (event: ScheduleEvent) => {
    setShowAdd(false);
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    setForm({
      title: event.title,
      description: event.description || "",
      startTime: start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }),
      endTime: end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }),
      allDay: event.allDay,
      target: event.target,
      type: event.type,
    });
    ev.setFormUserIds(event.assignees.map((a) => a.userId));
    setEditingEvent(event);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (status === "loading" || ev.loading) {
    return <InlineLoading />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-2 flex items-center gap-3">
        <MdCalendarMonth className={`text-dotan-green ${ev.refreshing ? "animate-spin" : ""}`} />
        לו&quot;ז יומי
        {ev.refreshing && <span className="text-xs font-normal text-gray-400">מעדכן...</span>}
      </h1>

      <DateNavigation
        date={date} isToday={isToday}
        onChangeDate={changeDate}
        onGoToToday={() => setDate(new Date().toISOString().split("T")[0])}
      />

      <TypeFilter
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        targetFilter={targetFilter} setTargetFilter={setTargetFilter}
        userTeam={ev.userTeam} isAdmin={ev.isAdmin}
      />

      {/* Sagal read-only banner */}
      {isSagal && (
        <div className="mb-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-center text-sm text-indigo-700 font-medium">
          צפייה בלבד — סגל מפקד
        </div>
      )}

      <AdminToolbar
        isAdmin={ev.isAdmin} isSagal={isSagal} canEdit={canEdit}
        showAdd={showAdd} editingEvent={!!editingEvent}
        syncing={ev.syncing} teamSyncing={ev.teamSyncing}
        teamSyncTarget={ev.teamSyncTarget} userTeam={ev.userTeam}
        visibleTeams={ev.visibleTeams} SYNC_TEAMS={ev.SYNC_TEAMS}
        onAddClick={() => { setShowAdd(true); resetForm(); }}
        onSync={ev.handleSync}
        onTeamSync={ev.handleTeamSync}
        onTeamRemind={ev.handleTeamRemind}
        onToggleTeamVisibility={ev.toggleTeamVisibility}
        onShowAllTeams={() => ev.setVisibleTeams(new Set(ev.SYNC_TEAMS))}
      />

      <SyncDiffPanel
        diff={ev.teamSyncDiff} onClose={() => ev.setTeamSyncDiff(null)}
        onNotify={ev.handleTeamNotifyChanges} notifyDisabled={ev.teamSyncing}
        label={`שינויים בלוז צוות ${ev.teamSyncTarget || ev.userTeam} היום`}
        notifyLabel="שלח התראה לצוות"
        unchangedLabel="לוז הצוות של היום לא השתנה"
        variant="team"
      />

      <SyncDiffPanel
        diff={ev.syncDiff} onClose={() => ev.setSyncDiff(null)}
        onNotify={canEdit ? ev.handleNotifyChanges : undefined} notifyDisabled={ev.syncing}
        label="שינויים בלוז היום"
        notifyLabel="שלח התראה"
        unchangedLabel="הלוז של היום לא השתנה"
        variant="platoon"
      />

      {showAdd && (
        <EventForm form={form} setForm={setForm}
          onSubmit={(e) => ev.handleAdd(e, form, resetForm, setShowAdd)}
          isEdit={false}
          onClose={() => { setShowAdd(false); resetForm(); }}
          allUsers={ev.allUsers} selectedUserIds={ev.formUserIds} onSelectedUserIdsChange={ev.setFormUserIds} />
      )}
      {editingEvent && (
        <EventForm form={form} setForm={setForm}
          onSubmit={(e) => ev.handleEdit(e, form, editingEvent, () => { setEditingEvent(null); resetForm(); })}
          isEdit={true}
          onClose={() => { setEditingEvent(null); resetForm(); }}
          allUsers={ev.allUsers} selectedUserIds={ev.formUserIds} onSelectedUserIdsChange={ev.setFormUserIds} />
      )}

      <AllDayEvents
        events={allDayEvents} isToday={isToday} canEdit={canEdit}
        myUserId={myUserId} myName={myName}
        onEdit={openEdit} onDelete={ev.handleDelete}
      />

      {/* Add note button */}
      {!nt.showNoteForm && !nt.editingNote && (
        <button onClick={() => { nt.setShowNoteForm(true); nt.resetNoteForm(); }}
          className="w-full mb-3 bg-gradient-to-l from-amber-500 to-amber-400 text-white py-2 rounded-xl hover:from-amber-600 hover:to-amber-500 transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm">
          <MdStickyNote2 className="text-base" /> הוסף הערה אישית
        </button>
      )}

      {nt.showNoteForm && (
        <NoteForm
          noteFormRef={nt.noteFormRef}
          editingNote={nt.editingNote}
          noteForm={nt.noteForm}
          setNoteForm={nt.setNoteForm}
          onSubmit={nt.editingNote ? nt.handleEditNote : nt.handleAddNote}
          onClose={() => { nt.setShowNoteForm(false); nt.resetNoteForm(); }}
        />
      )}

      <Timeline
        timedEvents={timedEvents} notes={nt.notes}
        date={date} isToday={isToday} canEdit={canEdit}
        myUserId={myUserId} myName={myName}
        reminding={ev.reminding} noteReminding={nt.noteReminding}
        nowRef={nowRef}
        onDetail={setDetailEvent} onEdit={openEdit}
        onDelete={ev.handleDelete} onRemind={ev.handleRemind}
        onRemindAssigned={ev.handleRemindAssigned}
        onAssign={ev.openAssign}
        onMove={(idx, dir) => ev.moveEvent(idx, dir, timedEvents)}
        onEditNote={nt.openEditNote}
        onDeleteNote={nt.handleDeleteNote}
        onRemindNote={nt.handleRemindNote}
      />

      {ev.events.length === 0 && nt.notes.length === 0 && !nt.showNoteForm && (
        <div className="text-center py-12 text-gray-500">
          <MdCalendarMonth className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין אירועים או הערות ליום זה</p>
          {canEdit && <p className="text-sm mt-2">לחץ &quot;הוסף אירוע&quot; כדי להוסיף</p>}
        </div>
      )}

      {detailEvent && (
        <EventDetailModal
          event={detailEvent} isAdmin={canEdit}
          onClose={() => setDetailEvent(null)} onEdit={openEdit}
          onAssign={ev.openAssign} onDelete={ev.handleDelete}
        />
      )}

      {ev.showAssign && (
        <AssignModal
          selectedUserIds={ev.selectedUserIds} allUsers={ev.allUsers}
          assignTeamFilter={ev.assignTeamFilter} userSearch={ev.userSearch}
          onToggleUser={(userId) => ev.setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
          )}
          onTeamFilterChange={ev.setAssignTeamFilter} onSearchChange={ev.setUserSearch}
          onSave={ev.handleAssign} onClose={() => ev.setShowAssign(null)}
        />
      )}

      {/* Floating scroll-to-now button */}
      {isToday && timedEvents.length > 0 && (
        <button
          onClick={() => nowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="fixed bottom-20 left-4 z-30 w-10 h-10 rounded-full bg-dotan-green-dark text-white shadow-lg flex items-center justify-center hover:bg-dotan-green transition active:scale-95"
          title="גלול לעכשיו"
        >
          <MdMyLocation className="text-xl" />
        </button>
      )}
    </div>
  );
}
