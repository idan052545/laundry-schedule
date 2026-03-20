"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MdAdd, MdClose, MdFilterList, MdBuild, MdDownload,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { Issue, Summary, User, getStatusConfig } from "./types";
import IssueDetail from "./IssueDetail";
import IssueForm from "./IssueForm";
import IssueCard from "./IssueCard";

export default function IssuesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { t, dateLocale } = useLanguage();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, new: 0, open: 0, urgent: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCompanion, setFormCompanion] = useState("נעמה לוי");
  const [formCompanionPhone, setFormCompanionPhone] = useState("0537176663");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formAssignees, setFormAssignees] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelected, setAssignSelected] = useState<string[]>([]);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const statusConfig = getStatusConfig(t);

  const fetchIssues = async () => {
    setLoading(true);
    const res = await fetch(`/api/issues?status=${filter}`);
    if (res.ok) {
      const data = await res.json();
      setIssues(data.issues);
      setSummary(data.summary);
      if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus !== "authenticated") return;

    const loadData = async () => {
      setLoading(true);
      const [issuesRes, usersRes] = await Promise.all([
        fetch(`/api/issues?status=${filter}`),
        fetch("/api/users-wall?team=all"),
      ]);
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setIssues(data.issues);
        setSummary(data.summary);
        if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(Array.isArray(data) ? data : data.users || []);
      }
      setLoading(false);
    };
    loadData();
  }, [authStatus, router, filter, session]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        description: formDesc || null,
        location: formLocation || null,
        imageUrl: formImageUrl || null,
        companion: formCompanion || null,
        companionPhone: formCompanionPhone || null,
        assigneeIds: formAssignees.length > 0 ? formAssignees : undefined,
      }),
    });
    if (res.ok) {
      setFormTitle(""); setFormDesc(""); setFormLocation(""); setFormCompanion("");
      setFormCompanionPhone(""); setFormImageUrl(""); setFormAssignees([]);
      setShowForm(false);
      await fetchIssues();
    }
    setSending(false);
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    await fetch("/api/issues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: issueId, action: "status", status: newStatus }),
    });
    await fetchIssues();
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !selectedIssue) return;
    setSendingComment(true);
    const res = await fetch("/api/issues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedIssue.id, action: "comment", comment: commentText }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedIssue(updated);
      setCommentText("");
      await fetchIssues();
    }
    setSendingComment(false);
  };

  const handleAssign = async () => {
    if (!selectedIssue) return;
    await fetch("/api/issues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedIssue.id, action: "assign", assigneeIds: assignSelected }),
    });
    setShowAssign(false);
    await fetchIssues();
    const res = await fetch(`/api/issues?status=all`);
    if (res.ok) {
      const data = await res.json();
      const updated = data.issues.find((i: Issue) => i.id === selectedIssue.id);
      if (updated) setSelectedIssue(updated);
    }
  };

  const handleDelete = async (issueId: string) => {
    if (!confirm(t.issues.deleteConfirm)) return;
    await fetch(`/api/issues?id=${issueId}`, { method: "DELETE" });
    setSelectedIssue(null);
    await fetchIssues();
  };

  const handleExport = () => {
    const rows = issues.map((i) => ({
      [t.issues.exportTitle]: i.title,
      [t.issues.exportStatus]: statusConfig[i.status]?.label || i.status,
      [t.issues.exportLocation]: i.location || "",
      [t.issues.exportDescription]: i.description || "",
      [t.issues.exportCompanion]: i.companion || "",
      [t.issues.exportCompanionPhone]: i.companionPhone || "",
      [t.issues.exportCreator]: i.createdBy.name,
      [t.issues.exportDate]: new Date(i.createdAt).toLocaleDateString(dateLocale),
      [t.issues.exportComments]: i.comments.length,
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.issues.exportFilename}_${new Date().toLocaleDateString(dateLocale)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authStatus === "loading" || loading) return <InlineLoading />;

  if (selectedIssue) {
    return (
      <IssueDetail
        issue={selectedIssue}
        isAdmin={isAdmin}
        userId={userId}
        commentText={commentText}
        setCommentText={setCommentText}
        sendingComment={sendingComment}
        onComment={handleComment}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onBack={() => setSelectedIssue(null)}
        showAssign={showAssign}
        setShowAssign={setShowAssign}
        allUsers={allUsers}
        assignSearch={assignSearch}
        setAssignSearch={setAssignSearch}
        assignSelected={assignSelected}
        setAssignSelected={setAssignSelected}
        onAssign={handleAssign}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dotan-green-dark flex items-center gap-2">
          <MdBuild className="text-amber-500" /> {t.issues.title}
        </h1>
        <div className="flex gap-2">
          {issues.length > 0 && (
            <button onClick={handleExport}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition" title={t.common.export}>
              <MdDownload className="text-xl" />
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 text-sm">
            {showForm ? <><MdClose /> {t.common.close}</> : <><MdAdd /> {t.issues.newIssue}</>}
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["new", "open", "urgent", "closed"] as const).map((key) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setFilter(filter === key ? "all" : key)}
              className={`p-3 rounded-xl border-2 text-center transition ${
                filter === key ? `${cfg.bg} ${cfg.border}` : "bg-white border-gray-100 hover:border-gray-200"
              }`}>
              <Icon className={`text-2xl mx-auto ${cfg.color}`} />
              <div className={`text-2xl font-bold ${cfg.color}`}>{summary[key]}</div>
              <div className="text-xs text-gray-500">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Create Form */}
      {showForm && (
        <IssueForm
          formTitle={formTitle} setFormTitle={setFormTitle}
          formDesc={formDesc} setFormDesc={setFormDesc}
          formLocation={formLocation} setFormLocation={setFormLocation}
          formImageUrl={formImageUrl} setFormImageUrl={setFormImageUrl}
          formCompanion={formCompanion} setFormCompanion={setFormCompanion}
          formCompanionPhone={formCompanionPhone} setFormCompanionPhone={setFormCompanionPhone}
          sending={sending} onSubmit={handleCreate}
        />
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3">
        <MdFilterList className="text-gray-400" />
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {t.common.all} ({summary.total})
          </button>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilter(filter === key ? "all" : key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === key ? `${cfg.bg} ${cfg.color} ${cfg.border} border` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {cfg.label} ({summary[key as keyof Summary]})
            </button>
          ))}
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-2">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            isAdmin={isAdmin}
            onSelect={() => { setSelectedIssue(issue); setCommentText(""); }}
            onStatusChange={handleStatusChange}
          />
        ))}

        {issues.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MdBuild className="text-5xl mx-auto mb-3 text-gray-300" />
            <p className="font-medium">{t.issues.noIssues} {filter !== "all" ? `${t.issues.inStatus} "${statusConfig[filter]?.label}"` : ""}</p>
            <p className="text-sm mt-1">{t.issues.addHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
