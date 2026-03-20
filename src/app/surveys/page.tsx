"use client";

import { Suspense, useState } from "react";
import { MdPoll, MdAdd, MdClose, MdPeople, MdGroups } from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { useSurveys } from "./useSurveys";
import SurveyDetail from "./SurveyDetail";
import SurveyForm from "./SurveyForm";
import SurveyList from "./SurveyList";

export default function SurveysPageWrapper() {
  return (
    <Suspense fallback={<InlineLoading />}>
      <SurveysPage />
    </Suspense>
  );
}

function SurveysPage() {
  const { t } = useLanguage();
  const {
    authStatus, loading, surveys, teamMembers, userTeam, userId, isSagal,
    selectedSurvey, setSelectedSurvey, viewScope, setViewScope,
    reminding, sending, editing, setEditing, editTitle, setEditTitle,
    editDesc, setEditDesc, editOptions, setEditOptions,
    handleCreate, handleRespond, handleClose, handleReopen,
    handleRemind, handleDelete, startEdit, handleEdit, handleExport,
  } = useSurveys();

  const [showForm, setShowForm] = useState(false);

  if (authStatus === "loading" || loading) return <InlineLoading />;

  if (!userTeam) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-gray-400">
        <MdPoll className="text-5xl mx-auto mb-3" />
        <p className="font-medium">{t.surveys.noTeam}</p>
        <p className="text-sm">{t.surveys.contactCommander}</p>
      </div>
    );
  }

  if (selectedSurvey) {
    return (
      <SurveyDetail
        survey={selectedSurvey}
        userId={userId}
        isSagal={isSagal}
        teamMembers={teamMembers}
        reminding={reminding}
        sending={sending}
        editing={editing}
        editTitle={editTitle}
        editDesc={editDesc}
        editOptions={editOptions}
        setEditing={setEditing}
        setEditTitle={setEditTitle}
        setEditDesc={setEditDesc}
        setEditOptions={setEditOptions}
        onBack={() => setSelectedSurvey(null)}
        onRespond={handleRespond}
        onClose={handleClose}
        onReopen={handleReopen}
        onRemind={handleRemind}
        onDelete={handleDelete}
        onExport={handleExport}
        onStartEdit={startEdit}
        onSaveEdit={handleEdit}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {isSagal && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm text-center font-medium">
          {t.surveys.sagalViewOnly}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dotan-green-dark flex items-center gap-2">
          <MdPoll className="text-purple-500" /> {t.surveys.title}
        </h1>
        {!isSagal && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 text-sm">
            {showForm ? <><MdClose /> {t.common.close}</> : <><MdAdd /> {t.surveys.newSurvey}</>}
          </button>
        )}
      </div>

      {/* Scope tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setViewScope("team")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            viewScope === "team" ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}>
          <MdPeople className="text-base" /> {t.surveys.teamTab} {userTeam}
        </button>
        <button onClick={() => setViewScope("platoon")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
            viewScope === "platoon" ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}>
          <MdGroups className="text-base" /> {t.surveys.platoonTab}
        </button>
      </div>

      {showForm && !isSagal && (
        <SurveyForm
          userTeam={userTeam}
          sending={sending}
          onCreate={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      <SurveyList
        surveys={surveys}
        teamMembers={teamMembers}
        userId={userId}
        viewScope={viewScope}
        onSelect={setSelectedSurvey}
      />
    </div>
  );
}
