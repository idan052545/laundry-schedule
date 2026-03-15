"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { MdMenuBook, MdAdd, MdClose, MdDelete, MdDownload, MdFilterList, MdUploadFile, MdPictureAsPdf, MdImage, MdEdit, MdCheck, MdVisibility, MdVisibilityOff, MdLabel } from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { upload } from "@vercel/blob/client";
import Avatar from "@/components/Avatar";

interface Material {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
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
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNewTag, setEditNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tags
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formNewTag, setFormNewTag] = useState("");

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchMaterials = useCallback(async () => {
    const res = await fetch("/api/materials");
    if (res.ok) {
      const data = await res.json();
      setMaterials(data.materials || data);
      setAllTags(data.allTags || []);
    }
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
          tags: formTags.length > 0 ? formTags : undefined,
          blobUrl: blob.url,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (res.ok) {
        const newMaterial = await res.json();
        setMaterials((prev) => [newMaterial, ...prev]);
        setTitle(""); setDescription(""); setCategory("general"); setFile(null); setFormTags([]); setFormNewTag(""); setShowForm(false);
        await fetchMaterials();
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
    setEditTags(material.tags || []);
    setEditNewTag("");
  };

  const handleEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    const res = await fetch("/api/materials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editTitle, description: editDescription, tags: editTags }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, ...updated } : m));
      setEditingId(null);
      await fetchMaterials(); // refresh allTags
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

  const filtered = materials.filter((m) => {
    if (filter !== "all" && m.category !== filter) return false;
    if (filterTag && !(m.tags || []).includes(filterTag)) return false;
    return true;
  });

  if (status === "loading" || loading) {
    return <InlineLoading />;
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

          {/* Tags */}
          <div>
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-1"><MdLabel /> תגיות</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formTags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-dotan-mint-light text-dotan-green-dark px-2.5 py-1 rounded-full border border-dotan-green">
                  {tag}
                  <button type="button" onClick={() => setFormTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-red-500"><MdClose className="text-sm" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="text" value={formNewTag} onChange={(e) => setFormNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formNewTag.trim()) {
                      e.preventDefault();
                      if (!formTags.includes(formNewTag.trim())) setFormTags((prev) => [...prev, formNewTag.trim()]);
                      setFormNewTag("");
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
                  placeholder="הוסף תגית..." list="existing-tags-form" />
                <datalist id="existing-tags-form">
                  {allTags.filter((t) => !formTags.includes(t)).map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <button type="button" onClick={() => {
                if (formNewTag.trim() && !formTags.includes(formNewTag.trim())) {
                  setFormTags((prev) => [...prev, formNewTag.trim()]);
                  setFormNewTag("");
                }
              }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition">
                <MdAdd />
              </button>
            </div>
            {/* Quick-pick existing tags */}
            {allTags.filter((t) => !formTags.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {allTags.filter((t) => !formTags.includes(t)).map((t) => (
                  <button key={t} type="button" onClick={() => setFormTags((prev) => [...prev, t])}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-dotan-mint-light hover:text-dotan-green-dark transition border border-gray-200">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
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

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
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

      {/* Tag filter — only show tags that exist on materials */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 items-center">
          <MdLabel className="text-gray-400 text-sm" />
          {filterTag && (
            <button onClick={() => setFilterTag(null)}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 transition">
              ✕ נקה
            </button>
          )}
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                filterTag === tag
                  ? "bg-dotan-green-dark text-white"
                  : "bg-dotan-mint-light text-dotan-green-dark border border-dotan-green hover:bg-dotan-green hover:text-white"
              }`}>
              {tag}
            </button>
          ))}
        </div>
      )}

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
                  {/* Edit tags */}
                  <div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {editTags.map((tag) => (
                        <span key={tag} className="flex items-center gap-0.5 text-[11px] bg-dotan-mint-light text-dotan-green-dark px-2 py-0.5 rounded-full border border-dotan-green">
                          {tag}
                          <button type="button" onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-red-500"><MdClose className="text-xs" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input type="text" value={editNewTag} onChange={(e) => setEditNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editNewTag.trim()) {
                            e.preventDefault();
                            if (!editTags.includes(editNewTag.trim())) setEditTags((prev) => [...prev, editNewTag.trim()]);
                            setEditNewTag("");
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-dotan-green outline-none"
                        placeholder="תגית..." list="existing-tags-edit" />
                      <datalist id="existing-tags-edit">
                        {allTags.filter((t) => !editTags.includes(t)).map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                      <button type="button" onClick={() => {
                        if (editNewTag.trim() && !editTags.includes(editNewTag.trim())) {
                          setEditTags((prev) => [...prev, editNewTag.trim()]);
                          setEditNewTag("");
                        }
                      }} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600"><MdAdd /></button>
                    </div>
                    {allTags.filter((t) => !editTags.includes(t)).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {allTags.filter((t) => !editTags.includes(t)).map((t) => (
                          <button key={t} type="button" onClick={() => setEditTags((prev) => [...prev, t])}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-dotan-mint-light hover:text-dotan-green-dark transition">
                            + {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                        {(material.tags || []).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-dotan-mint-light text-dotan-green-dark border border-dotan-green shrink-0">{tag}</span>
                        ))}
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
