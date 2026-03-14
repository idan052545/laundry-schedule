"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { MdMenuBook, MdAdd, MdClose, MdDelete, MdDownload, MdFilterList, MdUploadFile, MdPictureAsPdf, MdImage } from "react-icons/md";
import Avatar from "@/components/Avatar";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  fileType: string;
  hasFile: boolean;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
}

const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  general: { label: "כללי", color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
  weapons: { label: "נשקים", color: "text-red-600", bg: "bg-red-50 border-red-300" },
  navigation: { label: "ניווט", color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  "first-aid": { label: "עזרה ראשונה", color: "text-green-600", bg: "bg-green-50 border-green-300" },
  procedures: { label: "נהלים", color: "text-purple-600", bg: "bg-purple-50 border-purple-300" },
  other: { label: "אחר", color: "text-amber-600", bg: "bg-amber-50 border-amber-300" },
};

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <MdPictureAsPdf className="text-red-500 text-2xl" />;
  if (fileType.includes("image")) return <MdImage className="text-blue-500 text-2xl" />;
  return <MdUploadFile className="text-gray-500 text-2xl" />;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

export default function MaterialsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchMaterials = useCallback(async () => {
    const res = await fetch("/api/materials");
    if (res.ok) setMaterials(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchMaterials();
  }, [status, router, fetchMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSending(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("file", file);

    const res = await fetch("/api/materials", { method: "POST", body: formData });
    if (res.ok) {
      const newMaterial = await res.json();
      setMaterials((prev) => [newMaterial, ...prev]);
      setTitle(""); setDescription(""); setCategory("general"); setFile(null); setShowForm(false);
    } else {
      const err = await res.json();
      alert(err.error || "שגיאה");
    }
    setSending(false);
  };

  const handleDownload = async (material: Material) => {
    setDownloading(material.id);
    const res = await fetch(`/api/materials/${material.id}`);
    if (res.ok) {
      const data = await res.json();
      const link = document.createElement("a");
      link.href = data.fileData;
      link.download = data.fileName;
      link.click();
    }
    setDownloading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק חומר זה?")) return;
    const res = await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    if (res.ok) setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });

  const filtered = filter === "all" ? materials : materials.filter((m) => m.category === filter);

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark flex items-center gap-3">
          <MdMenuBook className="text-dotan-green" />
          חומר מקצועי
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 text-sm">
          {showForm ? <><MdClose /> סגור</> : <><MdAdd /> העלה חומר</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
            placeholder="שם החומר" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[80px] text-sm"
            placeholder="תיאור (אופציונלי)" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green outline-none text-sm">
            {Object.entries(CATEGORIES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm text-gray-700 border border-dashed border-gray-300">
              <MdUploadFile className="text-lg" />
              {file ? file.name : "בחר קובץ (PDF, תמונה, Word...)"}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            <p className="text-xs text-gray-400 mt-1">מקסימום 5MB</p>
          </div>
          <button type="submit" disabled={sending || !file}
            className="bg-dotan-green-dark text-white px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
            <MdUploadFile /> {sending ? "מעלה..." : "העלה חומר"}
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

      {/* Materials list */}
      <div className="space-y-3">
        {filtered.map((material) => {
          const cat = CATEGORIES[material.category] || CATEGORIES.general;
          const isDownloading = downloading === material.id;

          return (
            <div key={material.id} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint hover:shadow-md transition group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                  {getFileIcon(material.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{material.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cat.bg} ${cat.color}`}>{cat.label}</span>
                  </div>
                  {material.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mb-1">{material.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Avatar name={material.author.name} image={material.author.image} size="xs" />
                    <span>{material.author.name}</span>
                    <span>| {formatDate(material.createdAt)}</span>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{getFileExtension(material.fileName)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleDownload(material)} disabled={isDownloading}
                    className="flex items-center gap-1 text-xs font-medium text-dotan-green-dark hover:text-dotan-green transition bg-dotan-mint-light px-3 py-2 rounded-lg disabled:opacity-50">
                    <MdDownload /> {isDownloading ? "מוריד..." : "הורד"}
                  </button>
                  {material.author.id === userId && (
                    <button onClick={() => handleDelete(material.id)}
                      className="text-red-400 hover:text-red-600 transition p-2 opacity-0 group-hover:opacity-100">
                      <MdDelete />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdMenuBook className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>אין חומר מקצועי {filter !== "all" ? "בקטגוריה זו" : "עדיין"}</p>
          <p className="text-sm mt-2">לחץ &quot;העלה חומר&quot; כדי להתחיל</p>
        </div>
      )}
    </div>
  );
}
