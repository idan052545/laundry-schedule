"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MdDescription, MdAdd, MdClose, MdDelete, MdOpenInNew, MdFilterList, MdLink } from "react-icons/md";
import Avatar from "@/components/Avatar";

interface FormLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
}

const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  general: { label: "כללי", color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
  personnel: { label: "כוח אדם", color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  operations: { label: "מבצעים", color: "text-red-600", bg: "bg-red-50 border-red-300" },
  training: { label: "אימונים", color: "text-green-600", bg: "bg-green-50 border-green-300" },
  logistics: { label: "לוגיסטיקה", color: "text-amber-600", bg: "bg-amber-50 border-amber-300" },
};

export default function FormsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<FormLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState(false);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchForms = useCallback(async () => {
    const res = await fetch("/api/forms");
    if (res.ok) setForms(await res.json());
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
      body: JSON.stringify({ title, description, url, category }),
    });
    if (res.ok) {
      const newForm = await res.json();
      setForms((prev) => [newForm, ...prev]);
      setTitle(""); setDescription(""); setUrl(""); setCategory("general"); setShowForm(false);
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק טופס זה?")) return;
    const res = await fetch(`/api/forms?id=${id}`, { method: "DELETE" });
    if (res.ok) setForms((prev) => prev.filter((f) => f.id !== id));
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });

  const filtered = filter === "all" ? forms : forms.filter((f) => f.category === filter);

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark flex items-center gap-3">
          <MdDescription className="text-dotan-green" />
          טפסים
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 text-sm">
          {showForm ? <><MdClose /> סגור</> : <><MdAdd /> הוסף טופס</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
            placeholder="שם הטופס" required />
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
            placeholder="קישור לטופס (URL)" required dir="ltr" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[80px] text-sm"
            placeholder="תיאור (אופציונלי)" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none text-sm">
            {Object.entries(CATEGORIES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button type="submit" disabled={sending}
            className="bg-dotan-green-dark text-white px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
            <MdAdd /> {sending ? "מוסיף..." : "הוסף טופס"}
          </button>
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <MdFilterList className="text-gray-500" />
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          הכל
        </button>
        {Object.entries(CATEGORIES).map(([key, { label }]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Forms grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((form) => {
          const cat = CATEGORIES[form.category] || CATEGORIES.general;
          return (
            <div key={form.id} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-dotan-mint-light flex items-center justify-center shrink-0">
                    <MdLink className="text-xl text-dotan-green" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{form.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>{cat.label}</span>
                  </div>
                </div>
                {form.author.id === userId && (
                  <button onClick={() => handleDelete(form.id)} className="text-red-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100 shrink-0">
                    <MdDelete />
                  </button>
                )}
              </div>
              {form.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{form.description}</p>
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Avatar name={form.author.name} image={form.author.image} size="xs" />
                  <span>{form.author.name}</span>
                  <span>| {formatDate(form.createdAt)}</span>
                </div>
                <a href={form.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-dotan-green-dark hover:text-dotan-green transition bg-dotan-mint-light px-3 py-1.5 rounded-lg">
                  <MdOpenInNew /> פתח
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdDescription className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין טפסים {filter !== "all" ? "בקטגוריה זו" : "עדיין"}</p>
          <p className="text-sm mt-2">לחץ &quot;הוסף טופס&quot; כדי להתחיל</p>
        </div>
      )}
    </div>
  );
}
