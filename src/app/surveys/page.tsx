"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdAdd, MdClose, MdPoll, MdSend, MdDelete, MdDownload,
  MdNotifications, MdCheckCircle, MdLock, MdLockOpen, MdPerson,
  MdThumbUp, MdThumbDown, MdRadioButtonChecked, MdCheckBox, MdEdit,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";

interface User {
  id: string;
  name: string;
  image: string | null;
  team?: number | null;
}

interface SurveyResponse {
  id: string;
  answer: string;
  user: User;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  team: number;
  type: string;
  options: string | null;
  status: string;
  createdById: string;
  createdAt: string;
  createdBy: User;
  responses: SurveyResponse[];
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof MdPoll }> = {
  yes_no: { label: "כן / לא", icon: MdThumbUp },
  single: { label: "בחירה יחידה", icon: MdRadioButtonChecked },
  multi: { label: "בחירה מרובה", icon: MdCheckBox },
};

export default function SurveysPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [userTeam, setUserTeam] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [reminding, setReminding] = useState(false);
  const [scope, setScope] = useState<"all" | "team" | "platoon">("all");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("yes_no");
  const [formOptions, setFormOptions] = useState(["", ""]);
  const [formPlatoon, setFormPlatoon] = useState(false);
  const [sending, setSending] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>([]);

  // Team filter for detail view
  const [detailTeamFilter, setDetailTeamFilter] = useState<number | null>(null);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchSurveys = useCallback(async () => {
    const scopeParam = scope !== "all" ? `&scope=${scope}` : "";
    const res = await fetch(`/api/surveys?status=all${scopeParam}`);
    if (res.ok) {
      const data = await res.json();
      setSurveys(data.surveys);
      setTeamMembers(data.teamMembers);
      setUserTeam(data.userTeam);
      if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus === "authenticated") fetchSurveys();
  }, [authStatus, router, fetchSurveys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const opts = formType !== "yes_no" ? formOptions.filter((o) => o.trim()) : undefined;
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formTitle, description: formDesc || null, type: formType, options: opts, platoon: formPlatoon }),
    });
    if (res.ok) {
      setFormTitle(""); setFormDesc(""); setFormType("yes_no"); setFormOptions(["", ""]); setFormPlatoon(false);
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

    // Add non-responders
    const respondedIds = new Set(survey.responses.map((r) => r.user.id));
    teamMembers.filter((m) => !respondedIds.has(m.id)).forEach((m) => {
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (authStatus === "loading" || loading) return <InlineLoading />;

  if (!userTeam && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-gray-400">
        <MdPoll className="text-5xl mx-auto mb-3" />
        <p className="font-medium">אינך משויך לצוות</p>
        <p className="text-sm">פנה למפקד כדי להצטרף לצוות</p>
      </div>
    );
  }

  // Detail view
  if (selectedSurvey) {
    const options: string[] = selectedSurvey.options ? JSON.parse(selectedSurvey.options) : [];
    const myResponse = selectedSurvey.responses.find((r) => r.user.id === userId);
    const myAnswer = myResponse ? JSON.parse(myResponse.answer) : null;
    const isCreator = selectedSurvey.createdById === userId;
    const respondedIds = new Set(selectedSurvey.responses.map((r) => r.user.id));
    const notResponded = teamMembers.filter((m) => !respondedIds.has(m.id));

    // Calculate results
    const resultMap = new Map<string, number>();
    if (selectedSurvey.type === "yes_no") {
      resultMap.set("yes", 0);
      resultMap.set("no", 0);
    } else {
      options.forEach((_, i) => resultMap.set(String(i), 0));
    }
    selectedSurvey.responses.forEach((r) => {
      const ans = JSON.parse(r.answer);
      if (selectedSurvey.type === "multi") {
        (ans as number[]).forEach((i: number) => resultMap.set(String(i), (resultMap.get(String(i)) || 0) + 1));
      } else {
        resultMap.set(String(ans), (resultMap.get(String(ans)) || 0) + 1);
      }
    });
    const totalResponses = selectedSurvey.responses.length;

    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setSelectedSurvey(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          ← חזרה לסקרים
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-5">
          {/* Header */}
          {editing ? (
            <div className="space-y-3 border-b pb-4">
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-dotan-green outline-none"
                placeholder="כותרת" />
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[50px]"
                placeholder="תיאור (אופציונלי)" />
              {selectedSurvey.type !== "yes_no" && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 font-medium">אפשרויות:</label>
                  {editOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={opt} onChange={(e) => {
                        const newOpts = [...editOptions];
                        newOpts[i] = e.target.value;
                        setEditOptions(newOpts);
                      }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
                        placeholder={`אפשרות ${i + 1}`} />
                      {editOptions.length > 2 && (
                        <button type="button" onClick={() => setEditOptions(editOptions.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 px-2"><MdClose /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditOptions([...editOptions, ""])}
                    className="text-xs text-dotan-green hover:underline flex items-center gap-1"><MdAdd /> הוסף אפשרות</button>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
                <button onClick={handleEdit} disabled={sending}
                  className="px-4 py-1.5 text-sm bg-dotan-green-dark text-white rounded-lg hover:bg-dotan-green transition disabled:opacity-50">
                  {sending ? "שומר..." : "שמור"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-800">{selectedSurvey.title}</h1>
                  {isCreator && (
                    <button onClick={() => startEdit(selectedSurvey)} className="text-gray-400 hover:text-gray-600 transition">
                      <MdEdit className="text-lg" />
                    </button>
                  )}
                </div>
                {selectedSurvey.description && <p className="text-sm text-gray-500 mt-1">{selectedSurvey.description}</p>}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>{selectedSurvey.createdBy.name}</span>
                  <span>•</span>
                  <span>{formatDate(selectedSurvey.createdAt)}</span>
                  <span>•</span>
                  <span>{selectedSurvey.team === 0 ? "כל הפלוגה" : `צוות ${selectedSurvey.team}`}</span>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                selectedSurvey.status === "active" ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}>
                {selectedSurvey.status === "active" ? "פעיל" : "סגור"}
              </span>
            </div>
          )}

          {/* Voting section (if active and not yet voted or allow change) */}
          {selectedSurvey.status === "active" && (
            <div className="border rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-gray-700 text-sm">
                {myAnswer !== null ? "שנה תשובה:" : "הצבע:"}
              </h3>

              {selectedSurvey.type === "yes_no" && (
                <div className="flex gap-3">
                  <button onClick={() => handleRespond(selectedSurvey.id, "yes")}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                      myAnswer === "yes" ? "bg-green-500 text-white" : "bg-green-50 text-green-600 border-2 border-green-200 hover:border-green-400"
                    }`}>
                    <MdThumbUp /> כן
                  </button>
                  <button onClick={() => handleRespond(selectedSurvey.id, "no")}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                      myAnswer === "no" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-400"
                    }`}>
                    <MdThumbDown /> לא
                  </button>
                </div>
              )}

              {selectedSurvey.type === "single" && (
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <button key={i} onClick={() => handleRespond(selectedSurvey.id, i)}
                      className={`w-full text-right p-3 rounded-lg text-sm transition flex items-center gap-2 ${
                        myAnswer === i ? "bg-dotan-green-dark text-white" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                      }`}>
                      <MdRadioButtonChecked className={myAnswer === i ? "text-white" : "text-gray-300"} />
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {selectedSurvey.type === "multi" && (
                <MultiSelect options={options} selected={myAnswer || []} onSubmit={(selected) => handleRespond(selectedSurvey.id, selected)} />
              )}
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">תוצאות ({totalResponses}/{teamMembers.length})</h3>

            {selectedSurvey.type === "yes_no" && (
              <div className="space-y-2">
                {[{ key: "yes", label: "כן", color: "bg-green-500" }, { key: "no", label: "לא", color: "bg-red-500" }].map(({ key, label, color }) => {
                  const count = resultMap.get(key) || 0;
                  const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-8">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all flex items-center justify-end px-2`} style={{ width: `${Math.max(pct, 5)}%` }}>
                          <span className="text-xs text-white font-bold">{pct}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {(selectedSurvey.type === "single" || selectedSurvey.type === "multi") && (
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const count = resultMap.get(String(i)) || 0;
                  const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 flex-shrink-0 max-w-[120px] truncate">{opt}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div className="h-full bg-dotan-green rounded-full transition-all flex items-center justify-end px-2" style={{ width: `${Math.max(pct, 5)}%` }}>
                          <span className="text-xs text-white font-bold">{pct}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team filter for platoon surveys */}
          {selectedSurvey.team === 0 && (() => {
            const teams = [...new Set(teamMembers.map((m) => m.team).filter((t): t is number => t !== null && t !== undefined))].sort();
            return teams.length > 1 ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-500 font-medium">סנן לפי צוות:</span>
                <button onClick={() => setDetailTeamFilter(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${!detailTeamFilter ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  הכל
                </button>
                {teams.map((t) => (
                  <button key={t} onClick={() => setDetailTeamFilter(detailTeamFilter === t ? null : t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${detailTeamFilter === t ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    צוות {t}
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {/* Who responded / didn't */}
          {(() => {
            const filteredResponses = detailTeamFilter
              ? selectedSurvey.responses.filter((r) => r.user.team === detailTeamFilter)
              : selectedSurvey.responses;
            const filteredMembers = detailTeamFilter
              ? teamMembers.filter((m) => m.team === detailTeamFilter)
              : teamMembers;
            const filteredNotResponded = filteredMembers.filter((m) => !respondedIds.has(m.id));
            return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1"><MdCheckCircle /> ענו ({filteredResponses.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredResponses.map((r) => (
                      <div key={r.id} className="flex items-center gap-1.5 text-xs">
                        <Avatar name={r.user.name} image={r.user.image} size="xs" />
                        <span className="truncate">{r.user.name}</span>
                        {selectedSurvey.team === 0 && r.user.team && !detailTeamFilter && (
                          <span className="text-[10px] text-gray-400">({r.user.team})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1"><MdPerson /> לא ענו ({filteredNotResponded.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredNotResponded.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Avatar name={m.name} image={m.image} size="xs" />
                        <span className="truncate">{m.name}</span>
                        {selectedSurvey.team === 0 && m.team && !detailTeamFilter && (
                          <span className="text-[10px]">({m.team})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Creator actions */}
          {isCreator && (
            <div className="flex flex-wrap gap-2 pt-3 border-t">
              {selectedSurvey.status === "active" ? (
                <button onClick={() => handleClose(selectedSurvey.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1">
                  <MdLock /> סגור סקר
                </button>
              ) : (
                <button onClick={() => handleReopen(selectedSurvey.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1">
                  <MdLockOpen /> פתח מחדש
                </button>
              )}
              <button onClick={() => handleRemind(selectedSurvey.id)} disabled={reminding}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center gap-1 disabled:opacity-50">
                <MdNotifications /> {reminding ? "שולח..." : `תזכר (${notResponded.length})`}
              </button>
              <button onClick={() => handleExport(selectedSurvey)}
                className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                <MdDownload /> ייצוא
              </button>
              <button onClick={() => handleDelete(selectedSurvey.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1">
                <MdDelete /> מחק
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-dotan-green-dark flex items-center gap-2">
          <MdPoll className="text-purple-500" /> סקרים
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-3 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 text-sm">
          {showForm ? <><MdClose /> סגור</> : <><MdAdd /> סקר חדש</>}
        </button>
      </div>

      {/* Scope toggle */}
      <div className="flex gap-1.5 mb-4 bg-gray-100 rounded-lg p-1">
        {([["all", "הכל"], ["team", `צוות ${userTeam || ""}`], ["platoon", "פלוגה"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setScope(key)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
              scope === key ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 space-y-3">
          <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
            placeholder="שאלה / כותרת *" required />

          <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[60px]"
            placeholder="תיאור (אופציונלי)" />

          {/* Type selector */}
          <div className="flex gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, { label, icon: Icon }]) => (
              <button key={key} type="button" onClick={() => setFormType(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  formType === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                <Icon /> {label}
              </button>
            ))}
          </div>

          {/* Options for single/multi */}
          {formType !== "yes_no" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">אפשרויות:</label>
              {formOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={opt} onChange={(e) => {
                    const newOpts = [...formOptions];
                    newOpts[i] = e.target.value;
                    setFormOptions(newOpts);
                  }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
                    placeholder={`אפשרות ${i + 1}`} />
                  {formOptions.length > 2 && (
                    <button type="button" onClick={() => setFormOptions(formOptions.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 px-2">
                      <MdClose />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setFormOptions([...formOptions, ""])}
                className="text-xs text-dotan-green hover:underline flex items-center gap-1">
                <MdAdd /> הוסף אפשרות
              </button>
            </div>
          )}

          {/* Platoon toggle - only for commanders/admins */}
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
              <input type="checkbox" checked={formPlatoon} onChange={(e) => setFormPlatoon(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="font-medium text-purple-700">סקר לכל הפלוגה</span>
              <span className="text-xs text-purple-400">(כל החיילים יראו)</span>
            </label>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={sending}
              className="bg-dotan-green-dark text-white px-5 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
              <MdSend /> {sending ? "יוצר..." : "צור סקר"}
            </button>
          </div>
        </form>
      )}

      {/* Survey list */}
      <div className="space-y-2">
        {surveys.map((survey) => {
          const myResponse = survey.responses.find((r) => r.user.id === userId);
          const cfg = TYPE_CONFIG[survey.type] || TYPE_CONFIG.yes_no;
          return (
            <button key={survey.id} onClick={() => setSelectedSurvey(survey)}
              className="w-full text-right bg-white p-4 rounded-xl shadow-sm border-2 border-gray-100 hover:border-dotan-mint hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  survey.status === "active" ? "bg-purple-50 text-purple-500" : "bg-gray-100 text-gray-400"
                }`}>
                  <cfg.icon className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{survey.title}</h3>
                    {survey.team === 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 shrink-0">פלוגה</span>
                    )}
                    {survey.status === "closed" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 shrink-0">סגור</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{survey.createdBy.name}</span>
                    <span>•</span>
                    <span>{formatDate(survey.createdAt)}</span>
                    <span>•</span>
                    <span>{survey.responses.length}/{teamMembers.length} ענו</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {myResponse ? (
                    <MdCheckCircle className="text-green-500 text-xl" />
                  ) : survey.status === "active" ? (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">ממתין</span>
                  ) : null}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-dotan-green rounded-full transition-all" style={{ width: `${(survey.responses.length / Math.max(teamMembers.length, 1)) * 100}%` }} />
              </div>
            </button>
          );
        })}

        {surveys.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MdPoll className="text-5xl mx-auto mb-3 text-gray-300" />
            <p className="font-medium">אין סקרים עדיין</p>
            <p className="text-sm mt-1">צרו סקר חדש לצוות שלכם</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Multi-select helper component
function MultiSelect({ options, selected, onSubmit }: { options: string[]; selected: number[]; onSubmit: (sel: number[]) => void }) {
  const [local, setLocal] = useState<number[]>(selected);

  const toggle = (i: number) => {
    setLocal((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <button key={i} type="button" onClick={() => toggle(i)}
          className={`w-full text-right p-3 rounded-lg text-sm transition flex items-center gap-2 ${
            local.includes(i) ? "bg-dotan-green-dark text-white" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
          }`}>
          <MdCheckBox className={local.includes(i) ? "text-white" : "text-gray-300"} />
          {opt}
        </button>
      ))}
      <button onClick={() => onSubmit(local)}
        className="w-full bg-dotan-green-dark text-white py-2.5 rounded-lg font-medium text-sm hover:bg-dotan-green transition flex items-center justify-center gap-2">
        <MdSend /> שלח
      </button>
    </div>
  );
}
