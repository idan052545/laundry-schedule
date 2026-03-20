"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Survey, User } from "./types";

export function useSurveys() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [userTeam, setUserTeam] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [reminding, setReminding] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewScope, setViewScope] = useState<"team" | "platoon">(
    searchParams.get("tab") === "platoon" ? "platoon" : "team"
  );

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>([]);

  const userId = session?.user ? (session.user as { id: string }).id : null;
  const myRole = (session?.user as { role?: string } | undefined)?.role;
  const isSagal = myRole === "sagal";

  const fetchSurveys = useCallback(async () => {
    const res = await fetch(`/api/surveys?status=all`);
    if (res.ok) {
      const data = await res.json();
      setSurveys(data.surveys);
      setTeamMembers(data.teamMembers);
      setUserTeam(data.userTeam);
      if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") fetchSurveys();
  }, [authStatus, router, fetchSurveys]);

  const handleCreate = async (data: { title: string; description: string | null; type: string; options?: string[]; platoon: boolean }) => {
    setSending(true);
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchSurveys();
    setSending(false);
    return res.ok;
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

  const handleClose = async (surveyId: string) => {
    await fetch("/api/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: surveyId, action: "close" }),
    });
    await fetchSurveys();
    if (selectedSurvey?.id === surveyId) {
      setSelectedSurvey((prev) => prev ? { ...prev, status: "closed" } : null);
    }
  };

  const handleReopen = async (surveyId: string) => {
    await fetch("/api/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: surveyId, action: "reopen" }),
    });
    await fetchSurveys();
    if (selectedSurvey?.id === surveyId) {
      setSelectedSurvey((prev) => prev ? { ...prev, status: "active" } : null);
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
    if (!confirm("למחוק סקר זה?")) return;
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
      if (survey.type === "yes_no") {
        answerStr = answer === "yes" ? "כן" : "לא";
      } else if (survey.type === "single" && options) {
        answerStr = options[answer] || answer;
      } else if (survey.type === "multi" && options) {
        answerStr = (answer as number[]).map((i: number) => options[i] || i).join(", ");
      }
      return { שם: r.user.name, תשובה: answerStr };
    });

    const respondedIds = new Set(survey.responses.map((r) => r.user.id));
    const exportMembers = survey.team === 0 ? teamMembers : teamMembers.filter(m => m.team === survey.team);
    exportMembers.filter((m) => !respondedIds.has(m.id)).forEach((m) => {
      rows.push({ שם: m.name, תשובה: "לא ענה" });
    });

    const headers = ["שם", "תשובה"];
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, string>)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `סקר_${survey.title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    authStatus, loading, surveys, teamMembers, userTeam, isAdmin,
    userId, isSagal, selectedSurvey, setSelectedSurvey,
    viewScope, setViewScope, reminding, sending,
    editing, setEditing, editTitle, setEditTitle, editDesc, setEditDesc,
    editOptions, setEditOptions,
    handleCreate, handleRespond, handleClose, handleReopen,
    handleRemind, handleDelete, startEdit, handleEdit, handleExport,
  };
}
