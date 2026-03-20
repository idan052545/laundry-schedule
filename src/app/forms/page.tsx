"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdDescription, MdAdd, MdClose, MdDelete, MdOpenInNew, MdFilterList,
  MdLink, MdCheckCircle, MdCancel, MdSchedule, MdExpandMore, MdExpandLess,
  MdWarning, MdNotifications, MdRepeat,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";

interface UserBasic {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
}

interface Submission {
  id: string;
  userId: string;
  user: UserBasic;
}

interface FormLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  deadline: string | null;
  recurring: boolean;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
  submissions: Submission[];
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  const today = new Date().toISOString().split("T")[0];
  return deadline < today;
}

function isDueSoon(deadline: string | null): boolean {
  if (!deadline) return false;
  const today = new Date();
  const dl = new Date(deadline + "T23:59:59");
  const diff = dl.getTime() - today.getTime();
  return diff > 0 && diff < 2 * 24 * 60 * 60 * 1000; // within 2 days
}

export default function FormsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, dateLocale } = useLanguage();
  const [forms, setForms] = useState<FormLink[]>([]);
  const [allUsers, setAllUsers] = useState<UserBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [deadline, setDeadline] = useState("");
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);

  const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
    general: { label: t.forms.general, color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
    personnel: { label: t.forms.hr, color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
    operations: { label: t.forms.operations, color: "text-red-600", bg: "bg-red-50 border-red-300" },
    training: { label: t.forms.training, color: "text-green-600", bg: "bg-green-50 border-green-300" },
    logistics: { label: t.forms.logistics, color: "text-amber-600", bg: "bg-amber-50 border-amber-300" },
  };

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchForms = useCallback(async () => {
    const res = await fetch("/api/forms");
    if (res.ok) {
      const data = await res.json();
      setForms(data.forms);
      setAllUsers(data.allUsers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchForms();
  }, [status, router, fetchForms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, url, category, deadline: deadline || null }),
    });
    if (res.ok) {
      const newForm = await res.json();
      setForms((prev) => [newForm, ...prev]);
      setTitle(""); setDescription(""); setUrl(""); setCategory("general"); setDeadline(""); setShowForm(false);
    } else {
      const err = await res.json();
      alert(err.error || t.common.error);
    }
    setSending(false);
  };

  const handleToggleSubmission = async (formId: string) => {
    setSubmitting(formId);
    const res = await fetch("/api/forms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId }),
    });
    if (res.ok) {
      const { submitted } = await res.json();
      setForms((prev) => prev.map((f) => {
        if (f.id !== formId) return f;
        if (submitted) {
          return {
            ...f,
            submissions: [...f.submissions, {
              id: "temp",
              userId: userId!,
              user: { id: userId!, name: session?.user?.name || "", image: (session?.user as { image?: string })?.image || null, team: null },
            }],
          };
        }
        return { ...f, submissions: f.submissions.filter((s) => s.userId !== userId) };
      }));
    }
    setSubmitting(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.forms.deleteForm)) return;
    const res = await fetch(`/api/forms?id=${id}`, { method: "DELETE" });
    if (res.ok) setForms((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRemind = async (formId: string) => {
    setReminding(formId);
    const res = await fetch("/api/forms/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sent === 0) {
        alert(t.forms.allSubmitted);
      } else {
        alert(t.forms.reminderSent.replace("{n}", String(data.sent)));
      }
    } else {
      const err = await res.json();
      alert(err.error || t.common.error);
    }
    setReminding(null);
  };

  function formatDeadline(dl: string): string {
    const d = new Date(dl + "T12:00:00");
    return d.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });

  const filtered = filter === "all" ? forms : forms.filter((f) => f.category === filter);

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark flex items-center gap-3">
          <MdDescription className="text-dotan-green" />
          {t.forms.title}
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 text-sm">
          {showForm ? <><MdClose /> {t.common.close}</> : <><MdAdd /> {t.forms.addForm}</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
            placeholder={t.forms.formName} required />
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
            placeholder={t.forms.formUrl} required dir="ltr" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[80px] text-sm"
            placeholder={t.forms.descriptionOptional} />
          <div className="flex flex-wrap gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none text-sm">
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">{t.forms.deadline}</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none text-sm" />
            </div>
          </div>
          <button type="submit" disabled={sending}
            className="bg-dotan-green-dark text-white px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
            <MdAdd /> {sending ? t.common.saving : t.forms.addFormBtn}
          </button>
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <MdFilterList className="text-gray-500" />
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {t.common.all}
        </button>
        {Object.entries(CATEGORIES).map(([key, { label }]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Forms list */}
      <div className="space-y-3">
        {filtered.map((form) => {
          const cat = CATEGORIES[form.category] || CATEGORIES.general;
          const iSubmitted = form.submissions.some((s) => s.userId === userId);
          const overdue = isOverdue(form.deadline);
          const dueSoon = isDueSoon(form.deadline);
          const submittedCount = form.submissions.length;
          const isExpanded = expandedForm === form.id;
          const isSubmitting = submitting === form.id;

          return (
            <div key={form.id} className={`bg-white rounded-xl shadow-sm border-2 transition ${
              overdue && !iSubmitted ? "border-red-300" : dueSoon && !iSubmitted ? "border-amber-300" : "border-dotan-mint"
            }`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    iSubmitted ? "bg-green-100" : overdue ? "bg-red-100" : "bg-dotan-mint-light"
                  }`}>
                    {iSubmitted ? <MdCheckCircle className="text-xl text-green-600" /> : <MdLink className="text-xl text-dotan-green" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-sm">{form.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>{cat.label}</span>
                      {form.recurring && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-300 font-medium flex items-center gap-0.5">
                          <MdRepeat className="text-[10px]" /> {t.tasks.typeDaily}
                        </span>
                      )}
                      {iSubmitted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 font-medium">
                          {form.recurring ? t.forms.iSubmittedToday : t.forms.iSubmitted}
                        </span>
                      )}
                    </div>

                    {form.description && (
                      <p className="text-xs text-gray-500 mb-2">{form.description}</p>
                    )}

                    {/* Deadline & stats row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {form.recurring && (
                        <span className="flex items-center gap-1 font-medium text-violet-600">
                          <MdRepeat /> {t.tasks.typeDaily}
                        </span>
                      )}
                      {form.deadline && (
                        <span className={`flex items-center gap-1 font-medium ${
                          overdue ? "text-red-600" : dueSoon ? "text-amber-600" : "text-gray-500"
                        }`}>
                          {overdue ? <MdWarning /> : <MdSchedule />}
                          {t.forms.deadlineDate.replace("{date}", formatDeadline(form.deadline))}
                          {overdue && ` ${t.forms.deadlinePassed}`}
                          {dueSoon && !overdue && ` ${t.forms.deadlineSoon}`}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {t.forms.submittedCount.replace("{n}", String(submittedCount)).replace("{total}", String(allUsers.length))}
                      </span>
                      <span className="text-gray-400">
                        <Avatar name={form.author.name} image={form.author.image} size="xs" /> {form.author.name}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${submittedCount === allUsers.length ? "bg-green-500" : submittedCount > 0 ? "bg-dotan-green" : "bg-gray-200"}`}
                        style={{ width: `${allUsers.length > 0 ? (submittedCount / allUsers.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a href={form.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-dotan-green-dark hover:text-dotan-green transition bg-dotan-mint-light px-3 py-1.5 rounded-lg">
                      <MdOpenInNew /> {t.common.start}
                    </a>
                    <button onClick={() => handleToggleSubmission(form.id)} disabled={isSubmitting}
                      className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                        iSubmitted
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      }`}>
                      {iSubmitted
                        ? <><MdCheckCircle /> {form.recurring ? t.forms.iSubmittedToday : t.forms.iSubmitted}</>
                        : <><MdDescription /> {form.recurring ? t.forms.iRegisteredToday : t.forms.markSubmitted}</>}
                    </button>
                  </div>
                </div>

                {/* Expand toggle */}
                <button onClick={() => setExpandedForm(isExpanded ? null : form.id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2 transition">
                  {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                  {isExpanded ? t.forms.hide : t.forms.show} {form.recurring ? t.forms.whoSubmittedToday : t.forms.whoSubmitted} ({submittedCount}/{allUsers.length})
                </button>
              </div>

              {/* Expanded: who submitted / who didn't */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Submitted */}
                    <div>
                      <h4 className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                        <MdCheckCircle /> {t.forms.didSubmit} ({submittedCount})
                      </h4>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {form.submissions.length === 0 && (
                          <p className="text-xs text-gray-400">{t.forms.noOneYet}</p>
                        )}
                        {form.submissions.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 text-xs bg-green-50 px-2 py-1.5 rounded-lg">
                            <Avatar name={s.user.name} image={s.user.image} size="xs" />
                            <span className="text-gray-700">{s.user.name}</span>
                            {s.user.team && <span className="text-gray-400">{t.common.team} {s.user.team}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Not submitted */}
                    <div>
                      <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                        <MdCancel /> {t.forms.didNotSubmit} ({allUsers.length - submittedCount})
                      </h4>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {allUsers.length - submittedCount === 0 && (
                          <p className="text-xs text-green-600 font-medium">{t.forms.allDone}</p>
                        )}
                        {allUsers
                          .filter((u) => !form.submissions.some((s) => s.userId === u.id))
                          .map((u) => (
                            <div key={u.id} className="flex items-center gap-2 text-xs bg-red-50 px-2 py-1.5 rounded-lg">
                              <Avatar name={u.name} image={u.image} size="xs" />
                              <span className="text-gray-700">{u.name}</span>
                              {u.team && <span className="text-gray-400">{t.common.team} {u.team}</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Author actions */}
                  {form.author.id === userId && (
                    <div className="mt-3 flex items-center gap-3">
                      <button onClick={() => handleRemind(form.id)} disabled={reminding === form.id || submittedCount === allUsers.length}
                        className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                        <MdNotifications /> {reminding === form.id ? t.common.sending : `${t.forms.sendReminder} (${allUsers.length - submittedCount})`}
                      </button>
                      <button onClick={() => handleDelete(form.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition">
                        <MdDelete /> {t.forms.deleteFormBtn}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdDescription className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>{t.forms.noForms} {filter !== "all" ? t.forms.inCategory : t.forms.yet}</p>
          <p className="text-sm mt-2">{t.forms.addFormHint}</p>
        </div>
      )}
    </div>
  );
}
