"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { MdMenuBook, MdAdd, MdClose, MdDelete, MdDownload, MdFilterList, MdUploadFile, MdPictureAsPdf, MdImage, MdEdit, MdCheck, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { upload } from "@vercel/blob/client";
import Avatar from "@/components/Avatar";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  fileType: string;
  hasFile: boolean;
  isRead: boolean;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
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

    try {
      // Upload file directly to Vercel Blob from client
      const blob = await upload(`materials/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      // Save metadata to DB
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          blobUrl: blob.url,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (res.ok) {
        const newMaterial = await res.json();
        setMaterials((prev) => [newMaterial, ...prev]);
        setTitle(""); setDescription(""); setCategory("general"); setFile(null); setShowForm(false);
      } else {
        const err = await res.json();
        alert(err.error || "שגיאה");
      }
    } catch {
      alert("שגיאה בהעלאת הקובץ");
    }
    setSending(false);
  };

  const handleDownload = async (material: Material) => {
    setDownloading(material.id);
    const res = await fetch(`/api/materials/${material.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.blobUrl) {
        // Vercel Blob URL - fetch and download
        const fileRes = await fetch(data.blobUrl);
        const blob = await fileRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Legacy base64 data URL
        const [header, base64] = data.fileData.split(",");
        const mime = header.match(/:(.*?);/)?.[1] || data.fileType;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    }
    setDownloading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק חומר זה?")) return;
    const res = await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    if (res.ok) setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const startEdit = (material: Material) => {
    setEditingId(material.id);
    setEditTitle(material.title);
    setEditDescription(material.description || "");
  };

  const handleEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    const res = await fetch("/api/materials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editTitle, description: editDescription }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, ...updated } : m));
      setEditingId(null);
    }
  };

  const handleToggleRead = async (materialId: string) => {
    const res = await fetch("/api/materials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleRead", materialId }),
    });
    if (res.ok) {
      const { isRead } = await res.json();
      setMaterials((prev) => prev.map((m) => m.id === materialId ? { ...m, isRead } : m));
    }
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
            <p className="text-xs text-gray-400 mt-1">מקסימום 30MB</p>
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
          const isEditing = editingId === material.id;
          const canEdit = material.author.id === userId;

          return (
            <div key={material.id} className={`p-4 rounded-xl shadow-sm border hover:shadow-md transition group ${
              material.isRead ? "bg-gray-50 border-gray-200" : "bg-white border-dotan-mint"
            }`}>
              {isEditing ? (
                <div className="space-y-2">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
                    placeholder="שם החומר" />
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm min-h-[60px]"
                    placeholder="תיאור (אופציונלי)" />
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(material.id)}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-dotan-green-dark hover:bg-dotan-green px-3 py-1.5 rounded-lg transition">
                      <MdCheck /> שמור
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition">
                      <MdClose /> ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                      {getFileIcon(material.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <h3 className={`font-bold text-sm ${material.isRead ? "text-gray-500" : "text-gray-800"}`}>{material.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${cat.bg} ${cat.color}`}>{cat.label}</span>
                        {material.isRead && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 border border-green-200 shrink-0">נקרא</span>}
                      </div>
                      {material.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 mb-1">{material.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
                        <Avatar name={material.author.name} image={material.author.image} size="xs" />
                        <span>{material.author.name}</span>
                        <span>| {formatDate(material.createdAt)}</span>
                        <span className="bg-gray-100 px-1 py-0.5 rounded text-gray-500">{getFileExtension(material.fileName)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <button onClick={() => handleToggleRead(material.id)}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                        material.isRead
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {material.isRead ? <><MdVisibility /> נקרא</> : <><MdVisibilityOff /> סמן נקרא</>}
                    </button>
                    <button onClick={() => handleDownload(material)} disabled={isDownloading}
                      className="flex items-center gap-1 text-xs font-medium text-dotan-green-dark hover:text-dotan-green transition bg-dotan-mint-light px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                      <MdDownload /> {isDownloading ? "מוריד..." : "הורד"}
                    </button>
                    {canEdit && (
                      <button onClick={() => startEdit(material)}
                        className="text-blue-400 hover:text-blue-600 transition p-1.5">
                        <MdEdit />
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => handleDelete(material.id)}
                        className="text-red-400 hover:text-red-600 transition p-1.5">
                        <MdDelete />
                      </button>
                    )}
                  </div>
                </div>
              )}
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
