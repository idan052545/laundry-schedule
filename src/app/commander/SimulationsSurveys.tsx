"use client";

import { useEffect, useState, useCallback } from "react";
import SurveyDetailView from "./SurveyDetailView";
import SurveyListView from "./SurveyListView";
import { Survey, SurveyUser } from "./types";
import { useLanguage } from "@/i18n";

export default function SimulationsSurveys({ userId, commanderId, isCommander }: { userId: string; commanderId: string; isCommander: boolean }) {
  const { t, dateLocale } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [teamMembers, setTeamMembers] = useState<SurveyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [reminding, setReminding] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("yes_no");
  const [formOptions, setFormOptions] = useState(["", ""]);
  const [sending, setSending] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>([]);

  // Team filter for detail view
  const [detailTeamFilter, setDetailTeamFilter] = useState<number | null>(null);

  const fetchSurveys = useCallback(async () => {
    const res = await fetch(`/api/surveys?status=all&scope=platoon`);
    if (res.ok) {
      const data = await res.json();
      setSurveys((data.surveys as Survey[]).filter((s: Survey) => s.createdById === commanderId));
      setTeamMembers(data.teamMembers);
    }
    setLoading(false);
  }, [commanderId]);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const opts = formType !== "yes_no" ? formOptions.filter((o) => o.trim()) : undefined;
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formTitle, description: formDesc || null, type: formType, options: opts, platoon: true }),
    });
    if (res.ok) {
      setFormTitle(""); setFormDesc(""); setFormType("yes_no"); setFormOptions(["", ""]);
      setShowForm(false);
      await fetchSurveys();
    }
    setSending(false);
  };

  const handleRespond = async (surveyId: string, answer: unknown) => {
    const res = await fetch("/api/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: surveyId, action: "respond", answer }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSurveys((prev) => prev.map((s) => (s.id === surveyId ? updated : s)));
      if (selectedSurvey?.id === surveyId) setSelectedSurvey(updated);
    }
  };

  const handleAction = async (surveyId: string, action: string) => {
    await fetch("/api/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: surveyId, action }),
    });
    await fetchSurveys();
    if (selectedSurvey?.id === surveyId) {
      setSelectedSurvey((prev) => prev ? { ...prev, status: action === "close" ? "closed" : "active" } : null);
    }
  };

  const handleRemind = async (surveyId: string) => {
    setReminding(true);
    await fetch("/api/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: surveyId, action: "remind" }),
    });
    setReminding(false);
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm(t.commander.deleteSurveyConfirm)) return;
    await fetch(`/api/surveys?id=${surveyId}`, { method: "DELETE" });
    setSelectedSurvey(null);
    await fetchSurveys();
  };

  const startEdit = (survey: Survey) => {
    setEditTitle(survey.title);
    setEditDesc(survey.description || "");
    setEditOptions(survey.options ? JSON.parse(survey.options) : []);
    setEditing(true);
  };

  const handleEdit = async () => {
    if (!selectedSurvey) return;
    setSending(true);
    const opts = selectedSurvey.type !== "yes_no" ? editOptions.filter((o) => o.trim()) : undefined;
    const res = await fetch("/api/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedSurvey.id, action: "edit", title: editTitle, description: editDesc, options: opts }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedSurvey(updated);
      setEditing(false);
      await fetchSurveys();
    }
    setSending(false);
  };

  const handleExport = (survey: Survey) => {
    const options = survey.options ? JSON.parse(survey.options) : null;
    const rows = survey.responses.map((r) => {
      const answer = JSON.parse(r.answer);
      let answerStr = "";
      if (survey.type === "yes_no") answerStr = answer === "yes" ? t.commander.yes : t.commander.no;
      else if (survey.type === "single" && options) answerStr = options[answer] || answer;
      else if (survey.type === "multi" && options) answerStr = (answer as number[]).map((i: number) => options[i] || i).join(", ");
      const teamStr = r.user.team ? `${t.commander.teamN} ${r.user.team}` : "";
      return { [t.commander.exportName]: r.user.name, [t.commander.exportTeam]: teamStr, [t.commander.exportAnswer]: answerStr };
    });
    const respondedIds = new Set(survey.responses.map((r) => r.user.id));
    teamMembers.filter((m) => !respondedIds.has(m.id)).forEach((m) => {
      rows.push({ [t.commander.exportName]: m.name, [t.commander.exportTeam]: m.team ? `${t.commander.teamN} ${m.team}` : "", [t.commander.exportAnswer]: t.commander.didNotAnswer });
    });
    const headers = [t.commander.exportName, t.commander.exportTeam, t.commander.exportAnswer];
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, string>)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${t.commander.surveyPrefix}_${survey.title}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">{t.commander.loadingSurveys}</div>;

  if (selectedSurvey) {
    return (
      <SurveyDetailView
        survey={selectedSurvey}
        userId={userId}
        teamMembers={teamMembers}
        detailTeamFilter={detailTeamFilter}
        setDetailTeamFilter={setDetailTeamFilter}
        editing={editing}
        setEditing={setEditing}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editDesc={editDesc}
        setEditDesc={setEditDesc}
        editOptions={editOptions}
        setEditOptions={setEditOptions}
        sending={sending}
        reminding={reminding}
        onBack={() => { setSelectedSurvey(null); setDetailTeamFilter(null); }}
        onRespond={handleRespond}
        onAction={handleAction}
        onRemind={handleRemind}
        onExport={handleExport}
        onDelete={handleDelete}
        onStartEdit={startEdit}
        onSaveEdit={handleEdit}
        formatDate={formatDate}
      />
    );
  }

  return (
    <SurveyListView
      surveys={surveys}
      teamMembers={teamMembers}
      userId={userId}
      isCommander={isCommander}
      showForm={showForm}
      setShowForm={setShowForm}
      formTitle={formTitle}
      setFormTitle={setFormTitle}
      formDesc={formDesc}
      setFormDesc={setFormDesc}
      formType={formType}
      setFormType={setFormType}
      formOptions={formOptions}
      setFormOptions={setFormOptions}
      sending={sending}
      onSelectSurvey={setSelectedSurvey}
      onCreateSubmit={handleCreate}
      formatDate={formatDate}
    />
  );
}
