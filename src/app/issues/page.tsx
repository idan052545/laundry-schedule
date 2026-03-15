"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdAdd, MdClose, MdFilterList, MdWarning, MdCheckCircle,
  MdFiberNew, MdBuild, MdSend, MdDelete, MdEdit,
  MdLocationOn, MdPhone, MdPerson, MdImage, MdDownload,
  MdComment, MdAssignmentInd, MdArrowBack, MdSearch,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";

interface User {
  id: string;
  name: string;
  image: string | null;
  roomNumber?: string | null;
  phone?: string | null;
}

interface IssueComment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface IssueAssignee {
  id: string;
  user: User;
}

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  location: string | null;
  imageUrl: string | null;
  companion: string | null;
  companionPhone: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  assignees: IssueAssignee[];
  comments: IssueComment[];
}

interface Summary {
  total: number;
  new: number;
  open: number;
  urgent: number;
  closed: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof MdFiberNew; color: string; bg: string; border: string }> = {
  new: { label: "חדשה", icon: MdFiberNew, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  open: { label: "פתוחה", icon: MdBuild, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  urgent: { label: "דחופה", icon: MdWarning, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  closed: { label: "סגורה", icon: MdCheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
};

export default function IssuesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

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
  const [formCompanion, setFormCompanion] = useState("");
  const [formCompanionPhone, setFormCompanionPhone] = useState("");
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

  const fetchIssues = useCallback(async () => {
    const res = await fetch(`/api/issues?status=${filter}`);
    if (res.ok) {
      const data = await res.json();
      setIssues(data.issues);
      setSummary(data.summary);
      if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }, [filter]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users-wall?team=all");
    if (res.ok) {
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : data.users || []);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") {
      fetchIssues();
      fetchUsers();
    }
  }, [authStatus, router, fetchIssues, fetchUsers, session]);

  // Re-fetch when filter changes
  useEffect(() => {
    if (authStatus === "authenticated") {
      setLoading(true);
      fetchIssues();
    }
  }, [filter, authStatus, fetchIssues]);

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
    // Refresh selected issue
    const res = await fetch(`/api/issues?status=all`);
    if (res.ok) {
      const data = await res.json();
      const updated = data.issues.find((i: Issue) => i.id === selectedIssue.id);
      if (updated) setSelectedIssue(updated);
    }
  };

  const handleDelete = async (issueId: string) => {
    if (!confirm("למחוק תקלה זו?")) return;
    await fetch(`/api/issues?id=${issueId}`, { method: "DELETE" });
    setSelectedIssue(null);
    await fetchIssues();
  };

  const handleExport = () => {
    const rows = issues.map((i) => ({
      כותרת: i.title,
      סטטוס: STATUS_CONFIG[i.status]?.label || i.status,
      מיקום: i.location || "",
      תיאור: i.description || "",
      מלווה: i.companion || "",
      "טלפון מלווה": i.companionPhone || "",
      יוצר: i.createdBy.name,
      תאריך: new Date(i.createdAt).toLocaleDateString("he-IL"),
      "מספר תגובות": i.comments.length,
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
    a.download = `תקלות_${new Date().toLocaleDateString("he-IL")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (authStatus === "loading" || loading) return <InlineLoading />;

  // Detail modal
  if (selectedIssue) {
    const sc = STATUS_CONFIG[selectedIssue.status] || STATUS_CONFIG.new;
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button onClick={() => setSelectedIssue(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
          <MdArrowBack /> חזרה לרשימה
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Image */}
          {selectedIssue.imageUrl && (
            <div className="w-full max-h-64 overflow-hidden">
              <img src={selectedIssue.imageUrl} alt="" className="w-full object-cover" />
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-4">
            {/* Title + Status */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold text-gray-800">{selectedIssue.title}</h1>
              <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-bold ${sc.bg} ${sc.border} ${sc.color}`}>
                <sc.icon className="inline text-sm ml-1" />
                {sc.label}
              </span>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              {selectedIssue.location && (
                <span className="flex items-center gap-1"><MdLocationOn className="text-red-400" /> {selectedIssue.location}</span>
              )}
              <span className="flex items-center gap-1"><MdPerson className="text-gray-400" /> {selectedIssue.createdBy.name}</span>
              <span>{formatDate(selectedIssue.createdAt)}</span>
            </div>

            {/* Description */}
            {selectedIssue.description && (
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{selectedIssue.description}</p>
            )}

            {/* Companion */}
            {selectedIssue.companion && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <span className="font-medium text-amber-700">מלווה: </span>
                <span className="text-amber-800">{selectedIssue.companion}</span>
                {selectedIssue.companionPhone && (
                  <a href={`tel:${selectedIssue.companionPhone}`} className="flex items-center gap-1 text-amber-600 hover:underline mt-1">
                    <MdPhone /> {selectedIssue.companionPhone}
                  </a>
                )}
              </div>
            )}

            {/* Assignees */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">משובצים</h3>
                {isAdmin && (
                  <button onClick={() => { setAssignSelected(selectedIssue.assignees.map((a) => a.user.id)); setShowAssign(true); setAssignSearch(""); }}
                    className="text-xs text-dotan-green hover:underline flex items-center gap-1">
                    <MdAssignmentInd /> שבץ
                  </button>
                )}
              </div>
              {selectedIssue.assignees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedIssue.assignees.map((a) => (
                    <div key={a.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-sm">
                      <Avatar name={a.user.name} image={a.user.image} size="xs" />
                      <span>{a.user.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">לא שובצו עדיין</p>
              )}
            </div>

            {/* Status change (admin) */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => handleStatusChange(selectedIssue.id, key)}
                    disabled={selectedIssue.status === key}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                      selectedIssue.status === key
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} cursor-default`
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}>
                    <cfg.icon className="inline text-sm ml-1" />
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}

            {/* Admin actions */}
            {(isAdmin || selectedIssue.createdById === userId) && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDelete(selectedIssue.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <MdDelete /> מחק
                </button>
              </div>
            )}

            {/* Comments */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-1">
                <MdComment /> תגובות ({selectedIssue.comments.length})
              </h3>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {selectedIssue.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.user.name} image={c.user.image} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-gray-700">{c.user.name}</span>
                        <span className="text-gray-400">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
                {selectedIssue.comments.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">אין תגובות</p>
                )}
              </div>

              {/* Add comment */}
              <div className="flex gap-2">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder="הוסף תגובה..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none"
                  onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
                />
                <button onClick={handleComment} disabled={sendingComment || !commentText.trim()}
                  className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition disabled:opacity-50">
                  <MdSend className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assign modal */}
        {showAssign && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssign(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-800">שיבוץ לתקלה</h3>
                <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600"><MdClose /></button>
              </div>
              <div className="p-3">
                <div className="relative">
                  <MdSearch className="absolute right-3 top-2.5 text-gray-400" />
                  <input type="text" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)}
                    placeholder="חפש..."
                    className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                {allUsers
                  .filter((u) => u.name.includes(assignSearch))
                  .map((u) => (
                    <button key={u.id} onClick={() => setAssignSelected((prev) => prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-sm text-right transition ${
                        assignSelected.includes(u.id) ? "bg-dotan-mint-light border border-dotan-green" : "hover:bg-gray-50"
                      }`}>
                      <Avatar name={u.name} image={u.image} size="sm" />
                      <span className="flex-1 truncate">{u.name}</span>
                      {assignSelected.includes(u.id) && <MdCheckCircle className="text-dotan-green text-lg shrink-0" />}
                    </button>
                  ))}
              </div>
              <div className="p-3 border-t">
                <button onClick={handleAssign}
                  className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg font-medium hover:bg-dotan-green transition">
                  שמור ({assignSelected.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dotan-green-dark flex items-center gap-2">
          <MdBuild className="text-amber-500" /> תקלות
        </h1>
        <div className="flex gap-2">
          {issues.length > 0 && (
            <button onClick={handleExport}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition" title="ייצוא">
              <MdDownload className="text-xl" />
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 text-sm">
            {showForm ? <><MdClose /> סגור</> : <><MdAdd /> תקלה חדשה</>}
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["new", "open", "urgent", "closed"] as const).map((key) => {
          const cfg = STATUS_CONFIG[key];
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
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm">תקלה חדשה</h3>

          <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
            placeholder="כותרת *" required />

          <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[80px]"
            placeholder="תיאור..." />

          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
              placeholder="מיקום" />
            <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
              placeholder="קישור תמונה" dir="ltr" />
          </div>

          {/* Companion (persisted) */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <span className="text-xs font-medium text-amber-700 flex items-center gap-1"><MdPerson /> מלווה</span>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={formCompanion} onChange={(e) => setFormCompanion(e.target.value)}
                className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 outline-none bg-white"
                placeholder="שם מלווה" />
              <input type="tel" value={formCompanionPhone} onChange={(e) => setFormCompanionPhone(e.target.value)}
                className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 outline-none bg-white"
                placeholder="טלפון מלווה" dir="ltr" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={sending}
              className="bg-dotan-green-dark text-white px-5 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
              <MdSend /> {sending ? "שולח..." : "פתח תקלה"}
            </button>
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3">
        <MdFilterList className="text-gray-400" />
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            הכל ({summary.total})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
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
        {issues.map((issue) => {
          const sc = STATUS_CONFIG[issue.status] || STATUS_CONFIG.new;
          return (
            <button key={issue.id} onClick={() => { setSelectedIssue(issue); setCommentText(""); }}
              className="w-full text-right bg-white p-4 rounded-xl shadow-sm border-2 border-gray-100 hover:border-dotan-mint hover:shadow-md transition">
              <div className="flex items-start gap-3">
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  issue.status === "urgent" ? "bg-red-500 animate-pulse" :
                  issue.status === "new" ? "bg-blue-500" :
                  issue.status === "open" ? "bg-amber-500" : "bg-green-500"
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{issue.title}</h3>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${sc.bg} ${sc.border} ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                    {issue.location && (
                      <span className="flex items-center gap-0.5"><MdLocationOn className="text-red-300" /> {issue.location}</span>
                    )}
                    <span>{issue.createdBy.name}</span>
                    <span>{formatDate(issue.createdAt)}</span>
                    {issue.comments.length > 0 && (
                      <span className="flex items-center gap-0.5"><MdComment /> {issue.comments.length}</span>
                    )}
                    {issue.imageUrl && <MdImage className="text-purple-300" />}
                  </div>

                  {/* Assignees avatars */}
                  {issue.assignees.length > 0 && (
                    <div className="flex -space-x-1 mt-2 rtl:space-x-reverse">
                      {issue.assignees.slice(0, 4).map((a) => (
                        <div key={a.id} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                          <Avatar name={a.user.name} image={a.user.image} size="xs" />
                        </div>
                      ))}
                      {issue.assignees.length > 4 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                          +{issue.assignees.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick status change for admin */}
                {isAdmin && issue.status !== "closed" && (
                  <div className="shrink-0 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    {issue.status !== "urgent" && (
                      <button onClick={() => handleStatusChange(issue.id, "urgent")}
                        className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition">
                        דחוף
                      </button>
                    )}
                    <button onClick={() => handleStatusChange(issue.id, "closed")}
                      className="text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition">
                      סגור
                    </button>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {issues.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MdBuild className="text-5xl mx-auto mb-3 text-gray-300" />
            <p className="font-medium">אין תקלות {filter !== "all" ? `בסטטוס "${STATUS_CONFIG[filter]?.label}"` : ""}</p>
            <p className="text-sm mt-1">לחצו על &quot;תקלה חדשה&quot; כדי לפתוח תקלה</p>
          </div>
        )}
      </div>
    </div>
  );
}
