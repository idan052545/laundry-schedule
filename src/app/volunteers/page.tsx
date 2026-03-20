"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MdVolunteerActivism, MdAdd, MdPeople, MdPerson, MdAccessTime,
  MdClose, MdCheck, MdSwapHoriz, MdStar, MdStarBorder, MdStarHalf,
  MdWarning, MdBarChart, MdFilterList, MdSearch, MdSend,
  MdThumbUp, MdEdit, MdDelete, MdExpandMore, MdExpandLess,
  MdFileDownload, MdRefresh, MdNotifications,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import Avatar from "@/components/Avatar";
import { CATEGORY_CONFIG, STATUS_CONFIG, TEAM_COLORS, FEEDBACK_TYPES } from "./constants";
import type { VolRequest, Candidate, TitleSuggestion, StatsData } from "./types";
import * as XLSX from "xlsx";

type Tab = "active" | "my" | "stats";

export default function VolunteersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  // Helper: get HH:MM string for Israel timezone
  const nowTimeStr = () => {
    const d = new Date();
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
  };
  const plus15 = () => {
    const d = new Date(Date.now() + 15 * 60000);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
  };

  // Create form
  const [form, setForm] = useState({
    title: "", description: "", target: "all", requiredCount: 1,
    startTime: "", endTime: "", category: "other", priority: "normal",
    targetDetails: [] as { team: number; count: number }[],
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

  // Auto-refetch every 30s for urgent/live awareness
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

  // Get Israel timezone offset string like "+03:00" or "+02:00"
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
    const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); // YYYY-MM-DD
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
      setForm({ title: "", description: "", target: "all", requiredCount: 1, startTime: "", endTime: "", category: "other", priority: "normal", targetDetails: [] });
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
      return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
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
    // Build full datetime from the request's date (in Israel tz) + edited time
    const reqDate = new Date(editingRequest.startTime);
    const dateStr = reqDate.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }); // YYYY-MM-DD in Israel
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

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short", timeZone: "Asia/Jerusalem" });

  if (status === "loading" || loading) return <InlineLoading />;

  const myRequests = requests.filter(r => r.assignments.some(a => a.userId === myUserId && a.status !== "cancelled"));

  const filteredSuggestions = titleSuggestions.filter(s =>
    form.title.length > 0 && s.title.includes(form.title) && s.title !== form.title
  );

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MdVolunteerActivism className="text-green-600" />
          תורנויות
        </h1>
        <button
          onClick={() => { setForm(f => ({ ...f, startTime: nowTimeStr(), endTime: plus15() })); setShowCreate(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow hover:bg-green-700 transition"
        >
          <MdAdd /> יצירת תורנות
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {([
          { key: "active" as Tab, label: "פעילות", icon: MdPeople },
          { key: "my" as Tab, label: "שלי", icon: MdPerson },
          { key: "stats" as Tab, label: "סטטיסטיקה", icon: MdBarChart },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className="text-base" /> {t.label}
          </button>
        ))}
      </div>

      {/* Status filter for active tab */}
      {tab === "active" && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
          <MdFilterList className="text-gray-400 shrink-0" />
          {["open", "filled", "in-progress", "completed", "all"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 ${statusFilter === s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {s === "all" ? "הכל" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      )}

      {/* Active requests list */}
      {tab === "active" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
              <MdVolunteerActivism className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">אין תורנויות {statusFilter === "open" ? "פתוחות" : ""}</p>
            </div>
          ) : requests.map(req => {
            const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.other;
            const CatIcon = catConfig.icon;
            const activeAssignments = req.assignments.filter(a => a.status !== "cancelled" && a.status !== "replaced");
            const isMine = activeAssignments.some(a => a.userId === myUserId);
            const hasUrgentReplace = req.replacements.some(r => r.isUrgent);
            const slotsLeft = req.requiredCount - activeAssignments.length;

            return (
              <div
                key={req.id}
                className={`rounded-2xl border-2 overflow-hidden transition ${
                  hasUrgentReplace ? "border-red-300 bg-red-50/30 animate-pulse" :
                  req.isCommanderRequest ? "border-amber-300 bg-amber-50/20" :
                  req.priority === "urgent" ? "border-red-200 bg-red-50/20" :
                  "border-gray-200 bg-white"
                }`}
              >
                {/* Request header */}
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${catConfig.bg} ${catConfig.border} border flex items-center justify-center shrink-0`}>
                      <CatIcon className={`text-xl ${catConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-800">{req.title}</h3>
                        {req.isCommanderRequest && <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-[9px] font-bold">מפקד</span>}
                        {req.priority === "urgent" && <span className="px-1.5 py-0.5 bg-red-200 text-red-800 rounded text-[9px] font-bold">דחוף</span>}
                        {hasUrgentReplace && <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[9px] font-bold animate-bounce">צריך מחליף!</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_CONFIG[req.status]?.bg} ${STATUS_CONFIG[req.status]?.color}`}>
                          {STATUS_CONFIG[req.status]?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-0.5"><MdAccessTime className="text-xs" /> {fmtTime(req.startTime)}–{fmtTime(req.endTime)}</span>
                        <span>{fmtDate(req.startTime)}</span>
                        <span className="flex items-center gap-0.5"><MdPeople className="text-xs" /> {activeAssignments.length}/{req.requiredCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar name={req.createdBy.name} image={req.createdBy.image} size="xs" />
                        <span className="text-[10px] text-gray-400">{req.createdBy.name}</span>
                        {req.target !== "all" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-bold">
                            {req.target === "mixed" ? "מעורב" : req.target.replace("team-", "צוות ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assigned users */}
                  {activeAssignments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {activeAssignments.map(a => (
                        <div key={a.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border ${
                          a.assignmentType === "commander" ? "bg-amber-50 border-amber-200 text-amber-800" :
                          a.assignmentType === "team-member" ? "bg-cyan-50 border-cyan-200 text-cyan-800" :
                          "bg-green-50 border-green-200 text-green-800"
                        }`}>
                          <Avatar name={a.user.name} image={a.user.image} size="xs" />
                          <span>{a.user.name}</span>
                          {a.assignmentType === "commander" && <span className="text-[8px]">(מפקד)</span>}
                          {a.assignmentType === "team-member" && <span className="text-[8px]">(צוות)</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {req.status === "open" && !isMine && slotsLeft > 0 && (
                      <button onClick={() => handleAssign(req.id)} disabled={submitting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition disabled:opacity-50">
                        <MdThumbUp className="text-sm" /> אני מתנדב/ת
                      </button>
                    )}
                    {(req.status === "open" || req.status === "filled") && (isCommander || req.createdById === myUserId) && (
                      <button onClick={() => { setSelectedRequest(req); fetchCandidates(req); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
                        <MdPeople className="text-sm" /> שיבוץ
                      </button>
                    )}
                    {isMine && req.status !== "completed" && req.status !== "cancelled" && (
                      <button onClick={() => setShowReplace(req.assignments.find(a => a.userId === myUserId && a.status !== "cancelled")?.id || null)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition">
                        <MdSwapHoriz className="text-sm" /> צריך מחליף
                      </button>
                    )}
                    {req.replacements.filter(r => r.status === "seeking").map(r => (
                      r.originalUserId !== myUserId && (
                        <button key={r.id} onClick={() => handleAcceptReplace(r.id)} disabled={submitting}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition disabled:opacity-50 ${
                            r.isUrgent ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-orange-600 hover:bg-orange-700"
                          }`}>
                          <MdSwapHoriz className="text-sm" /> {r.isUrgent ? "אני מחליף (דחוף!)" : "אני מחליף"}
                        </button>
                      )
                    ))}
                    {req.status === "open" && (req.createdById === myUserId || isCommander) && (
                      <button onClick={() => startEditingRequest(req)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-[10px] font-medium hover:bg-blue-50 transition">
                        <MdEdit className="text-xs" /> עריכה
                      </button>
                    )}
                    {req.status === "open" && (req.createdById === myUserId || isCommander) && (
                      <button onClick={() => handleNotify(req)} disabled={submitting}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-200 text-green-600 text-[10px] font-medium hover:bg-green-50 transition disabled:opacity-50">
                        <MdNotifications className="text-xs" /> התראה
                      </button>
                    )}
                    {req.status === "open" && (req.createdById === myUserId || isCommander) && (
                      <button onClick={() => handleStatusChange(req.id, "cancelled")}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[10px] font-medium hover:bg-gray-50 transition">
                        <MdDelete className="text-xs" /> ביטול
                      </button>
                    )}
                    {(req.status === "filled" || req.status === "in-progress") && (req.createdById === myUserId || isCommander) && (
                      <button onClick={() => handleStatusChange(req.id, "completed")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 text-white text-xs font-bold hover:bg-gray-800 transition">
                        <MdCheck className="text-sm" /> סיום
                      </button>
                    )}
                    {req.status === "completed" && isMine && req._count.feedback === 0 && (
                      <button onClick={() => setShowFeedback(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition">
                        <MdStar className="text-sm" /> דרג/י
                      </button>
                    )}
                    {req.status === "completed" && isMine && (
                      <button onClick={() => setShowDispute(req.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-[10px] font-medium hover:bg-amber-50 transition">
                        <MdEdit className="text-xs" /> ערעור שעות
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* My assignments tab */}
      {tab === "my" && (
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
              <MdPerson className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">אין תורנויות משובצות</p>
            </div>
          ) : myRequests.map(req => {
            const myAssignment = req.assignments.find(a => a.userId === myUserId && a.status !== "cancelled");
            if (!myAssignment) return null;
            const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.other;
            const CatIcon = catConfig.icon;
            return (
              <div key={req.id} className="bg-white rounded-2xl border-2 border-green-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${catConfig.bg} flex items-center justify-center`}>
                    <CatIcon className={`text-xl ${catConfig.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-800">{req.title}</h3>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{fmtDate(req.startTime)} {fmtTime(req.startTime)}–{fmtTime(req.endTime)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STATUS_CONFIG[req.status]?.bg} ${STATUS_CONFIG[req.status]?.color}`}>
                        {STATUS_CONFIG[req.status]?.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {myAssignment.assignmentType === "self" ? "התנדבתי" : myAssignment.assignmentType === "commander" ? "שובצתי ע\"י מפקד" : "שובצתי ע\"י חבר צוות"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {req.status !== "completed" && req.status !== "cancelled" && (
                    <button onClick={() => setShowReplace(myAssignment.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition">
                      <MdSwapHoriz className="text-sm" /> צריך מחליף
                    </button>
                  )}
                  {req.status === "completed" && (
                    <>
                      <button onClick={() => setShowFeedback(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition">
                        <MdStar className="text-sm" /> דרג/י
                      </button>
                      <button onClick={() => setShowDispute(req.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-[10px] font-medium hover:bg-amber-50 transition">
                        <MdEdit className="text-xs" /> ערעור שעות
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats tab */}
      {tab === "stats" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {["day", "week", "month"].map(p => (
              <button key={p} onClick={() => setStatsPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statsPeriod === p ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {p === "day" ? "יומי" : p === "week" ? "שבועי" : "חודשי"}
              </button>
            ))}
            <button onClick={exportStats} disabled={!stats}
              className="mr-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition disabled:opacity-50">
              <MdFileDownload className="text-sm" /> ייצוא
            </button>
          </div>

          {stats ? (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
                  <div className="text-2xl font-black text-green-700">{stats.totalAssignments}</div>
                  <div className="text-[10px] text-green-600 font-medium">סה&quot;כ שיבוצים</div>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
                  <div className="text-2xl font-black text-blue-700">{stats.leaderboard.length}</div>
                  <div className="text-[10px] text-blue-600 font-medium">מתנדבים</div>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-200 p-3 text-center">
                  <div className="text-2xl font-black text-purple-700">{stats.averageRating?.toFixed(1) || "—"}</div>
                  <div className="text-[10px] text-purple-600 font-medium">דירוג ממוצע</div>
                </div>
              </div>

              {/* Team breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">התפלגות לפי צוות</h3>
                <div className="space-y-2">
                  {Object.entries(stats.teamTotals).sort(([, a], [, b]) => b.count - a.count).map(([team, data]) => {
                    const maxCount = Math.max(...Object.values(stats.teamTotals).map(d => d.count));
                    const pct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                    return (
                      <div key={team} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-16 shrink-0 px-2 py-0.5 rounded text-center border ${TEAM_COLORS[parseInt(team)] || TEAM_COLORS[0]}`}>
                          {parseInt(team) === 0 ? "אחר" : `צוות ${team}`}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-8 text-center">{data.count}</span>
                        <span className="text-[10px] text-gray-400 w-14 text-left">{(data.minutes / 60).toFixed(1)} שעות</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-800 mb-3">מתנדבים מובילים</h3>
                <div className="space-y-2">
                  {stats.leaderboard.slice(0, 15).map((u, idx) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-6 text-center ${idx < 3 ? "text-amber-500" : "text-gray-400"}`}>
                        {idx + 1}
                      </span>
                      <Avatar name={u.name} image={u.image} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">{u.name}</div>
                        <div className="text-[10px] text-gray-400">{u.count} תורנויות · {(u.totalMinutes / 60).toFixed(1)} שעות</div>
                      </div>
                      {u.team && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TEAM_COLORS[u.team] || TEAM_COLORS[0]}`}>
                          {u.team}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <InlineLoading />
          )}
        </div>
      )}

      {/* === MODALS === */}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MdAdd className="text-green-600" /> יצירת תורנות</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><MdClose className="text-xl" /></button>
            </div>

            <div className="space-y-4">
              {/* Title with suggestions */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-600 mb-1 block">שם התורנות *</label>
                <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setShowTitleSuggestions(true); }}
                  onFocus={() => setShowTitleSuggestions(true)}
                  placeholder="לדוגמה: ניקיון חדר אוכל" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 transition" />
                {showTitleSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredSuggestions.map(s => (
                      <button key={s.id} onClick={() => { setForm(f => ({ ...f, title: s.title, category: s.category })); setShowTitleSuggestions(false); }}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between">
                        <span>{s.title}</span>
                        <span className="text-[10px] text-gray-400">{s.usageCount}×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">תיאור</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="פירוט נוסף..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-300 transition" />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">קטגוריה</label>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
                          form.category === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}>
                        <Icon className="text-sm" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">מי צריך?</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: "all", label: "כל הפלוגה" },
                    { key: "team-14", label: "צוות 14" },
                    { key: "team-15", label: "צוות 15" },
                    { key: "team-16", label: "צוות 16" },
                    { key: "team-17", label: "צוות 17" },
                    { key: "mixed", label: "מעורב" },
                  ].map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, target: t.key }))}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
                        form.target === t.key ? "bg-green-600 text-white border-green-600" : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mixed target details */}
              {form.target === "mixed" && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="text-[11px] font-medium text-gray-600">כמה מכל צוות?</div>
                  {[14, 15, 16, 17].map(team => {
                    const detail = form.targetDetails.find(d => d.team === team);
                    return (
                      <div key={team} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 w-16">צוות {team}</span>
                        <input type="number" min={0} max={20} value={detail?.count || 0}
                          onChange={e => {
                            const count = parseInt(e.target.value) || 0;
                            setForm(f => {
                              const details = f.targetDetails.filter(d => d.team !== team);
                              if (count > 0) details.push({ team, count });
                              return { ...f, targetDetails: details, requiredCount: details.reduce((s, d) => s + d.count, 0) };
                            });
                          }}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Count + Priority */}
              <div className="grid grid-cols-2 gap-4">
                {form.target !== "mixed" && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">כמה מתנדבים?</label>
                    <input type="number" min={1} max={50} value={form.requiredCount}
                      onChange={e => setForm(f => ({ ...f, requiredCount: parseInt(e.target.value) || 1 }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-center focus:ring-2 focus:ring-green-300 transition" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">עדיפות</label>
                  <div className="flex gap-2">
                    <button onClick={() => setForm(f => ({ ...f, priority: "normal" }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${form.priority === "normal" ? "bg-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                      רגיל
                    </button>
                    <button onClick={() => setForm(f => ({ ...f, priority: "urgent" }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${form.priority === "urgent" ? "bg-red-600 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                      דחוף!
                    </button>
                  </div>
                </div>
              </div>

              {/* Times (same day — time only) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">התחלה *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-center focus:ring-2 focus:ring-green-300 transition" />
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">סיום *</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-center focus:ring-2 focus:ring-green-300 transition" />
                </div>
              </div>

              <button onClick={handleCreate} disabled={submitting || !form.title || !form.startTime || !form.endTime}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg hover:bg-green-700 transition disabled:opacity-50">
                {submitting ? "יוצר..." : "פרסם תורנות"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment / Candidates modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">שיבוץ — {selectedRequest.title}</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600"><MdClose className="text-lg" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCandidates ? <InlineLoading /> : (
                <div className="space-y-2">
                  {candidates.map(c => (
                    <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                      c.isAssigned ? "bg-green-50 border-green-300" : c.isFree ? "bg-white border-gray-200 hover:border-green-300" : "bg-gray-50 border-gray-200"
                    }`}>
                      <Avatar name={c.name} image={c.image} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-800">{c.name}</span>
                          {c.team && <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${TEAM_COLORS[c.team] || TEAM_COLORS[0]}`}>{c.team}</span>}
                          {c.isAssigned && <span className="text-[8px] font-bold px-1 py-0.5 bg-green-200 text-green-800 rounded">משובץ</span>}
                        </div>
                        {c.conflicts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.conflicts.map((cf, i) => (
                              <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                cf.priority >= 3 ? "bg-red-50 border-red-200 text-red-700" :
                                cf.priority >= 2 ? "bg-amber-50 border-amber-200 text-amber-700" :
                                "bg-gray-50 border-gray-200 text-gray-600"
                              }`}>
                                {cf.title}
                              </span>
                            ))}
                          </div>
                        )}
                        {c.isFree && !c.isAssigned && <span className="text-[10px] text-green-600 font-medium">פנוי/ה</span>}
                      </div>
                      {!c.isAssigned && (
                        <div className="flex gap-1">
                          <button onClick={() => handleAssign(selectedRequest.id, c.id, "commander")} disabled={submitting}
                            title="שבץ כמפקד"
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition disabled:opacity-50">
                            <MdStar className="text-sm" />
                          </button>
                          <button onClick={() => handleAssign(selectedRequest.id, c.id, "team-member")} disabled={submitting}
                            title="שבץ כחבר צוות"
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50">
                            <MdCheck className="text-sm" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Replace modal */}
      {showReplace && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowReplace(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdSwapHoriz className="text-orange-500" /> בקשת החלפה</h2>
            <textarea value={replaceForm.reason} onChange={e => setReplaceForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="סיבה (לא חובה)" rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none mb-3" />
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={replaceForm.isUrgent} onChange={e => setReplaceForm(f => ({ ...f, isUrgent: e.target.checked }))}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
              <span className="text-xs font-medium text-red-700">דחוף! (ישלח התראה מיוחדת)</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => handleReplace(showReplace)} disabled={submitting}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 ${replaceForm.isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}>
                {submitting ? "שולח..." : "שלח בקשה"}
              </button>
              <button onClick={() => setShowReplace(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowFeedback(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdStar className="text-purple-500" /> דירוג התורנות</h2>
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setFeedbackForm(f => ({ ...f, rating: n }))}
                  className="text-3xl transition hover:scale-110">
                  {n <= feedbackForm.rating ? <MdStar className="text-amber-400" /> : <MdStarBorder className="text-gray-300" />}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 justify-center mb-3">
              {FEEDBACK_TYPES.map(t => (
                <button key={t.value} onClick={() => setFeedbackForm(f => ({ ...f, type: t.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    feedbackForm.type === t.value ? "bg-purple-600 text-white border-purple-600" : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}>
                  <t.icon className="inline text-sm" /> {t.label}
                </button>
              ))}
            </div>
            <textarea value={feedbackForm.comment} onChange={e => setFeedbackForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="משהו נוסף?" rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => handleFeedback(showFeedback)} disabled={submitting || feedbackForm.rating === 0}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50">
                {submitting ? "שולח..." : "שלח דירוג"}
              </button>
              <button onClick={() => setShowFeedback(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {showDispute && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowDispute(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdEdit className="text-amber-500" /> ערעור שעות</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">שעת התחלה בפועל</label>
                <input type="datetime-local" value={disputeForm.claimedStartTime} onChange={e => setDisputeForm(f => ({ ...f, claimedStartTime: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">שעת סיום בפועל</label>
                <input type="datetime-local" value={disputeForm.claimedEndTime} onChange={e => setDisputeForm(f => ({ ...f, claimedEndTime: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <textarea value={disputeForm.reason} onChange={e => setDisputeForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="סיבה (לא חובה)" rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleDispute(showDispute)} disabled={submitting || !disputeForm.claimedStartTime || !disputeForm.claimedEndTime}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50">
                {submitting ? "שולח..." : "שלח ערעור"}
              </button>
              <button onClick={() => setShowDispute(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setEditingRequest(null)}>
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MdEdit className="text-blue-500" /> עריכת תורנות</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">שם</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">תיאור</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">התחלה</label>
                  <input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-center" />
                </div>
                <div className="min-w-0">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">סיום</label>
                  <input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-center" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">כמות מתנדבים</label>
                <input type="number" min={1} max={50} value={editForm.requiredCount}
                  onChange={e => setEditForm(f => ({ ...f, requiredCount: parseInt(e.target.value) || 1 }))}
                  className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-center" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleEdit} disabled={submitting || !editForm.title}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {submitting ? "שומר..." : "שמור"}
              </button>
              <button onClick={() => setEditingRequest(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
