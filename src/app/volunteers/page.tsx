"use client";

import {
  MdVolunteerActivism, MdAdd, MdPeople, MdPerson,
  MdBarChart, MdFilterList,
} from "react-icons/md";
import { useEffect } from "react";
import { InlineLoading } from "@/components/LoadingScreen";
import TranslateButton, { useTranslation } from "@/components/TranslateButton";
import { useLanguage } from "@/i18n";
import { STATUS_CONFIG } from "./constants";
import { useVolunteers } from "./useVolunteers";
import type { Tab } from "./useVolunteers";
import RequestCard from "./RequestCard";
import MyAssignmentCard from "./MyAssignmentCard";
import StatsTab from "./StatsTab";
import CreateModal from "./modals/CreateModal";
import CandidatesModal from "./modals/CandidatesModal";
import ReplaceModal from "./modals/ReplaceModal";
import FeedbackModal from "./modals/FeedbackModal";
import DisputeModal from "./modals/DisputeModal";
import EditModal from "./modals/EditModal";

export default function VolunteersPage() {
  const { t } = useLanguage();
  const { translateTexts, getTranslation, isEnglish } = useTranslation();
  const v = useVolunteers();

  const allTitles = [...v.requests, ...v.myRequests].map(r => r.title);
  useEffect(() => {
    if (isEnglish && allTitles.length > 0) translateTexts(allTitles);
  }, [isEnglish, allTitles.join("\0")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (v.status === "loading" || v.loading) return <InlineLoading />;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MdVolunteerActivism className="text-green-600" />
            {t.volunteers.title}
          </h1>
          {isEnglish && allTitles.length > 0 && (
            <TranslateButton
              size="md"
              texts={allTitles}
              onTranslated={() => translateTexts(allTitles)}
            />
          )}
        </div>
        {!v.isSagal && (
          <button
            onClick={() => { v.setForm(f => ({ ...f, startTime: v.nowTimeStr(), endTime: v.plus15() })); v.setShowCreate(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow hover:bg-green-700 transition"
          >
            <MdAdd /> {v.isCommander ? t.volunteers.createVolunteer : t.volunteers.helpRequest}
          </button>
        )}
      </div>

      {/* Hierarchy of helping pyramid */}
      <div className="mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl px-4 py-3">
        <div className="flex items-center justify-center gap-1 mb-2">
          <MdVolunteerActivism className="text-green-600 text-sm" />
          <span className="text-[11px] font-bold text-green-800">{t.volunteers.helpHierarchy}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-28 py-1 rounded-lg bg-green-600 text-white text-center text-[10px] font-bold shadow-sm">
            {t.volunteers.helpPlatoon}
          </div>
          <div className="w-20 py-1 rounded-lg bg-green-400 text-white text-center text-[10px] font-bold shadow-sm">
            {t.volunteers.helpTeam}
          </div>
          <div className="w-14 py-1 rounded-lg bg-green-200 text-green-800 text-center text-[10px] font-bold">
            {t.volunteers.helpSelf}
          </div>
        </div>
      </div>

      {v.isSagal && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-medium text-center">
          {t.volunteers.sagalViewOnly}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {([
          { key: "active" as Tab, label: t.volunteers.activityTab, icon: MdPeople },
          { key: "my" as Tab, label: t.volunteers.myTab, icon: MdPerson },
          { key: "stats" as Tab, label: t.volunteers.statsTab, icon: MdBarChart },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => v.setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
              v.tab === t.key ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className="text-base" /> {t.label}
          </button>
        ))}
      </div>

      {/* Status filter for active tab */}
      {v.tab === "active" && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
          <MdFilterList className="text-gray-400 shrink-0" />
          {["open", "filled", "in-progress", "completed", "all"].map(s => (
            <button key={s} onClick={() => v.setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${v.statusFilter === s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {s === "all" ? t.common.all : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      )}

      {/* Active requests list */}
      {v.tab === "active" && (
        <div className="space-y-3">
          {v.requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
              <MdVolunteerActivism className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">{t.volunteers.noVolunteers} {v.statusFilter === "open" ? t.volunteers.openTab : ""}</p>
            </div>
          ) : v.requests.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              myUserId={v.myUserId}
              isCommander={v.isCommander}
              isSagal={v.isSagal}
              submitting={v.submitting}
              fmtTime={v.fmtTime}
              fmtDate={v.fmtDate}
              getTranslation={getTranslation}
              onAssign={v.handleAssign}
              onOpenCandidates={(req) => { v.setSelectedRequest(req); v.fetchCandidates(req); }}
              onShowReplace={v.setShowReplace}
              onAcceptReplace={v.handleAcceptReplace}
              onStartEdit={v.startEditingRequest}
              onNotify={v.handleNotify}
              onRemindAssigned={v.handleRemindAssigned}
              onStatusChange={v.handleStatusChange}
              onDelete={v.handleDelete}
              onShowFeedback={v.setShowFeedback}
              onShowDispute={v.startDispute}
            />
          ))}
        </div>
      )}

      {/* My assignments tab */}
      {v.tab === "my" && (
        <div className="space-y-3">
          {v.myRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
              <MdPerson className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">{t.volunteers.noAssignments}</p>
            </div>
          ) : v.myRequests.map(req => (
            <MyAssignmentCard
              key={req.id}
              req={req}
              myUserId={v.myUserId}
              fmtTime={v.fmtTime}
              fmtDate={v.fmtDate}
              getTranslation={getTranslation}
              onShowReplace={(id) => v.setShowReplace(id)}
              onShowFeedback={(id) => v.setShowFeedback(id)}
              onShowDispute={(id) => v.startDispute(id)}
            />
          ))}
        </div>
      )}

      {/* Stats tab */}
      {v.tab === "stats" && (
        <StatsTab
          stats={v.stats}
          statsPeriod={v.statsPeriod}
          setStatsPeriod={v.setStatsPeriod}
          exportStats={v.exportStats}
        />
      )}

      {/* === MODALS === */}

      {v.showCreate && (
        <CreateModal
          isCommander={v.isCommander}
          form={v.form}
          setForm={v.setForm}
          showTitleSuggestions={v.showTitleSuggestions}
          setShowTitleSuggestions={v.setShowTitleSuggestions}
          filteredSuggestions={v.filteredSuggestions}
          locationSuggestions={v.locationSuggestions}
          showLocationSuggestions={v.showLocationSuggestions}
          setShowLocationSuggestions={v.setShowLocationSuggestions}
          submitting={v.submitting}
          onClose={() => v.setShowCreate(false)}
          onCreate={v.handleCreate}
        />
      )}

      {v.selectedRequest && (
        <CandidatesModal
          selectedRequest={v.selectedRequest}
          candidates={v.candidates}
          loadingCandidates={v.loadingCandidates}
          submitting={v.submitting}
          onClose={() => v.setSelectedRequest(null)}
          onAssign={v.handleAssign}
        />
      )}

      {v.showReplace && (
        <ReplaceModal
          showReplace={v.showReplace}
          replaceForm={v.replaceForm}
          setReplaceForm={v.setReplaceForm}
          submitting={v.submitting}
          onClose={() => v.setShowReplace(null)}
          onReplace={v.handleReplace}
        />
      )}

      {v.showFeedback && (
        <FeedbackModal
          showFeedback={v.showFeedback}
          feedbackForm={v.feedbackForm}
          setFeedbackForm={v.setFeedbackForm}
          submitting={v.submitting}
          onClose={() => v.setShowFeedback(null)}
          onSubmit={v.handleFeedback}
        />
      )}

      {v.showDispute && (
        <DisputeModal
          showDispute={v.showDispute}
          disputeForm={v.disputeForm}
          setDisputeForm={v.setDisputeForm}
          submitting={v.submitting}
          onClose={() => v.setShowDispute(null)}
          onSubmit={v.handleDispute}
        />
      )}

      {v.editingRequest && (
        <EditModal
          editingRequest={v.editingRequest}
          editForm={v.editForm}
          setEditForm={v.setEditForm}
          submitting={v.submitting}
          onClose={() => v.setEditingRequest(null)}
          onEdit={v.handleEdit}
        />
      )}
    </div>
  );
}
