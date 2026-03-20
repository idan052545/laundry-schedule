"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import type { VolRequest, Candidate, TitleSuggestion, StatsData } from "./types";
import { useLanguage } from "@/i18n";

export type Tab = "active" | "my" | "stats";

export function useVolunteers() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { dateLocale } = useLanguage();
  const [tab, setTab] = useState<Tab>("active");
  const [requests, setRequests] = useState<VolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VolRequest | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState<string | null>(null);
  const [showReplace, setShowReplace] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");

  const myUserId = (session?.user as { id: string } | undefined)?.id;
  const myRole = (session?.user as { role?: string } | undefined)?.role;
  const isCommander = myRole === "admin" || myRole === "commander";
  const isSagal = myRole === "sagal";

  const nowTimeStr = () => {
    const d = new Date();
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
  };
  const plus15 = () => {
    const d = new Date(Date.now() + 15 * 60000);
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
  };

  // Create form
  const [form, setForm] = useState({
    title: "", description: "", target: "all", requiredCount: 1,
    startTime: "", endTime: "", category: "other", priority: "normal",
    targetDetails: [] as { team: number; count: number }[],
    allowPartial: false,
  });
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  // Feedback form
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, type: "preserve", comment: "" });

  // Dispute form
  const [disputeForm, setDisputeForm] = useState({ claimedStartTime: "", claimedEndTime: "", reason: "" });

  // Replace form
  const [replaceForm, setReplaceForm] = useState({ reason: "", isUrgent: false });

  // Edit state
  const [editingRequest, setEditingRequest] = useState<VolRequest | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", startTime: "", endTime: "", requiredCount: 1 });

  const fetchRequests = useCallback(async () => {
    const res = await fetch(`/api/volunteers?status=${statusFilter}`);
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`/api/volunteers/stats?period=${statsPeriod}`);
    if (res.ok) setStats(await res.json());
  }, [statsPeriod]);

  const titlesLoaded = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetchRequests();
      if (!titlesLoaded.current) {
        titlesLoaded.current = true;
        fetch("/api/volunteers/titles").then(r => r.ok ? r.json() : []).then(setTitleSuggestions);
      }
    }
  }, [status, router, fetchRequests]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => { fetchRequests(); }, 30000);
    return () => clearInterval(interval);
  }, [status, fetchRequests]);

  useEffect(() => {
    if (tab === "stats") fetchStats();
  }, [tab, fetchStats]);

  const fetchCandidates = async (req: VolRequest) => {
    setLoadingCandidates(true);
    const params = new URLSearchParams({
      requestId: req.id,
      startTime: req.startTime,
      endTime: req.endTime,
      target: req.target,
    });
    if (req.targetDetails) params.set("targetDetails", req.targetDetails);
    const res = await fetch(`/api/volunteers/candidates?${params}`);
    if (res.ok) setCandidates(await res.json());
    setLoadingCandidates(false);
  };

  const getIsraelOffset = (date: Date) => {
    const utcStr = date.toLocaleString("en-US", { timeZone: "UTC", hour12: false });
    const ilStr = date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem", hour12: false });
    const diffMs = new Date(ilStr).getTime() - new Date(utcStr).getTime();
    const h = String(Math.floor(Math.abs(diffMs) / 3600000)).padStart(2, "0");
    const m = String(Math.floor((Math.abs(diffMs) % 3600000) / 60000)).padStart(2, "0");
    return `${diffMs >= 0 ? "+" : "-"}${h}:${m}`;
  };

  const handleCreate = async () => {
    if (!form.title || !form.startTime || !form.endTime) return;
    setSubmitting(true);
    const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const offset = getIsraelOffset(new Date());
    const res = await fetch("/api/volunteers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startTime: `${todayDate}T${form.startTime}:00${offset}`,
        endTime: `${todayDate}T${form.endTime}:00${offset}`,
        targetDetails: form.target === "mixed" ? form.targetDetails : undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ title: "", description: "", target: "all", requiredCount: 1, startTime: "", endTime: "", category: "other", priority: "normal", targetDetails: [], allowPartial: false });
      await fetchRequests();
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSubmitting(false);
  };

  const handleAssign = async (requestId: string, userId?: string, type?: string) => {
    setSubmitting(true);
    const res = await fetch("/api/volunteers/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, userId, assignmentType: type }),
    });
    if (res.ok) {
      await fetchRequests();
      if (selectedRequest) {
        const updated = await fetch(`/api/volunteers?status=all`).then(r => r.json());
        const found = updated.find((r: VolRequest) => r.id === selectedRequest.id);
        if (found) { setSelectedRequest(found); fetchCandidates(found); }
      }
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSubmitting(false);
  };

  const handleUnassign = async (assignmentId: string) => {
    if (!confirm("להסיר שיבוץ?")) return;
    await fetch(`/api/volunteers/assign?id=${assignmentId}`, { method: "DELETE" });
    await fetchRequests();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch("/api/volunteers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    await fetchRequests();
    if (selectedRequest?.id === id) setSelectedRequest(null);
  };

  const handleReplace = async (assignmentId: string) => {
    setSubmitting(true);
    const res = await fetch("/api/volunteers/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, ...replaceForm }),
    });
    if (res.ok) {
      setShowReplace(null);
      setReplaceForm({ reason: "", isUrgent: false });
      await fetchRequests();
    }
    setSubmitting(false);
  };

  const handleAcceptReplace = async (replacementId: string) => {
    setSubmitting(true);
    await fetch("/api/volunteers/replace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replacementId }),
    });
    await fetchRequests();
    setSubmitting(false);
  };

  const handleFeedback = async (requestId: string) => {
    if (feedbackForm.rating === 0) return;
    setSubmitting(true);
    await fetch("/api/volunteers/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, ...feedbackForm }),
    });
    setShowFeedback(null);
    setFeedbackForm({ rating: 0, type: "preserve", comment: "" });
    setSubmitting(false);
  };

  const handleDispute = async (requestId: string) => {
    if (!disputeForm.claimedStartTime || !disputeForm.claimedEndTime) return;
    setSubmitting(true);
    await fetch("/api/volunteers/dispute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, ...disputeForm }),
    });
    setShowDispute(null);
    setDisputeForm({ claimedStartTime: "", claimedEndTime: "", reason: "" });
    setSubmitting(false);
  };

  const startEditingRequest = (req: VolRequest) => {
    const toTimeStr = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
    };
    setEditForm({
      title: req.title,
      description: req.description || "",
      startTime: toTimeStr(req.startTime),
      endTime: toTimeStr(req.endTime),
      requiredCount: req.requiredCount,
    });
    setEditingRequest(req);
  };

  const handleEdit = async () => {
    if (!editingRequest) return;
    setSubmitting(true);
    const reqDate = new Date(editingRequest.startTime);
    const dateStr = reqDate.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const offset = getIsraelOffset(reqDate);
    const res = await fetch("/api/volunteers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingRequest.id,
        title: editForm.title,
        description: editForm.description || null,
        startTime: `${dateStr}T${editForm.startTime}:00${offset}`,
        endTime: `${dateStr}T${editForm.endTime}:00${offset}`,
        requiredCount: editForm.requiredCount,
      }),
    });
    if (res.ok) {
      setEditingRequest(null);
      await fetchRequests();
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSubmitting(false);
  };

  const handleNotify = async (req: VolRequest) => {
    const slotsLeft = req.requiredCount - req.assignments.filter(a => a.status !== "cancelled" && a.status !== "replaced").length;
    const body = `${req.title} — דרושים עוד ${slotsLeft} מתנדבים! ${fmtTime(req.startTime)}–${fmtTime(req.endTime)}`;
    setSubmitting(true);
    await fetch("/api/volunteers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: req.id, notify: true, notifyBody: body }),
    });
    alert("נשלחה התראה");
    setSubmitting(false);
  };

  const exportStats = () => {
    if (!stats) return;
    const wb = XLSX.utils.book_new();
    const rows = stats.leaderboard.map(u => ({
      שם: u.name,
      צוות: u.team || "-",
      "מספר תורנויות": u.count,
      "סה\"כ דקות": Math.round(u.totalMinutes),
      "סה\"כ שעות": (u.totalMinutes / 60).toFixed(1),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "התפלגות");
    XLSX.writeFile(wb, `תורנויות_${stats.period}.xlsx`);
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "short", timeZone: "Asia/Jerusalem" });

  const myRequests = requests.filter(r => r.assignments.some(a => a.userId === myUserId && a.status !== "cancelled"));

  const filteredSuggestions = titleSuggestions.filter(s =>
    form.title.length > 0 && s.title.includes(form.title) && s.title !== form.title
  );

  return {
    status, loading, tab, setTab,
    requests, myRequests, myUserId, isCommander, isSagal,
    statusFilter, setStatusFilter,
    showCreate, setShowCreate,
    selectedRequest, setSelectedRequest,
    candidates, loadingCandidates, fetchCandidates,
    stats, statsPeriod, setStatsPeriod, exportStats,
    showFeedback, setShowFeedback,
    showDispute, setShowDispute,
    showReplace, setShowReplace,
    submitting,
    form, setForm, showTitleSuggestions, setShowTitleSuggestions, filteredSuggestions,
    feedbackForm, setFeedbackForm,
    disputeForm, setDisputeForm,
    replaceForm, setReplaceForm,
    editingRequest, setEditingRequest, editForm, setEditForm,
    nowTimeStr, plus15,
    handleCreate, handleAssign, handleUnassign, handleStatusChange,
    handleReplace, handleAcceptReplace, handleFeedback, handleDispute,
    startEditingRequest, handleEdit, handleNotify,
    fmtTime, fmtDate,
  };
}
