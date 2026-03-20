"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { MdFolder, MdAdd, MdClose, MdDelete, MdDownload, MdFilterList, MdUploadFile, MdPictureAsPdf, MdImage, MdArticle } from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { upload } from "@vercel/blob/client";
import Avatar from "@/components/Avatar";
import { useLanguage } from "@/i18n";

interface TaskFormat {
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

const CATEGORY_STYLES: Record<string, { color: string; bg: string }> = {
  general: { color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
  guard: { color: "text-red-600", bg: "bg-red-50 border-red-300" },
  operations: { color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  training: { color: "text-green-600", bg: "bg-green-50 border-green-300" },
  logistics: { color: "text-amber-600", bg: "bg-amber-50 border-amber-300" },
  other: { color: "text-purple-600", bg: "bg-purple-50 border-purple-300" },
};

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <MdPictureAsPdf className="text-red-500 text-2xl" />;
  if (fileType.includes("image")) return <MdImage className="text-blue-500 text-2xl" />;
  if (fileType.includes("word") || fileType.includes("document")) return <MdArticle className="text-blue-700 text-2xl" />;
  return <MdUploadFile className="text-gray-500 text-2xl" />;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

export default function FormatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, dateLocale } = useLanguage();
  const [formats, setFormats] = useState<TaskFormat[]>([]);
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

  const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
    general: { label: t.formats.general, ...CATEGORY_STYLES.general },
    guard: { label: t.formats.guards, ...CATEGORY_STYLES.guard },
    operations: { label: t.formats.operations, ...CATEGORY_STYLES.operations },
    training: { label: t.formats.training, ...CATEGORY_STYLES.training },
    logistics: { label: t.formats.logistics, ...CATEGORY_STYLES.logistics },
    other: { label: t.formats.other, ...CATEGORY_STYLES.other },
  };

  const fetchFormats = useCallback(async () => {
    const res = await fetch("/api/task-formats");
    if (res.ok) setFormats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchFormats();
  }, [status, router, fetchFormats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSending(true);

    try {
      // Upload file directly to Vercel Blob from client
      const blob = await upload(`formats/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      // Save metadata to DB
      const res = await fetch("/api/task-formats", {
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
        const newFormat = await res.json();
        setFormats((prev) => [newFormat, ...prev]);
        setTitle(""); setDescription(""); setCategory("general"); setFile(null); setShowForm(false);
      } else {
        const err = await res.json();
        alert(err.error || t.common.error);
      }
    } catch {
      alert(t.common.error);
    }
    setSending(false);
  };

  const handleDownload = async (format: TaskFormat) => {
    setDownloading(format.id);
    const res = await fetch(`/api/task-formats/${format.id}`);
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
    if (!confirm(t.formats.deleteFormat)) return;
    const res = await fetch(`/api/task-formats?id=${id}`, { method: "DELETE" });
    if (res.ok) setFormats((prev) => prev.filter((f) => f.id !== id));
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });

  const filtered = filter === "all" ? formats : formats.filter((f) => f.category === filter);

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark flex items-center gap-3">
          <MdFolder className="text-dotan-green" />
          {t.formats.title}
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 text-sm">
          {showForm ? <><MdClose /> {t.common.close}</> : <><MdAdd /> {t.formats.uploadFormat}</>}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">{t.formats.subtitle}</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
            placeholder={t.formats.formatName} required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[80px] text-sm"
            placeholder={t.formats.descriptionPlaceholder} />
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
              {file ? file.name : t.formats.chooseFile}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.pptx,.ppt"
              onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            <p className="text-xs text-gray-400 mt-1">{t.common.max30mb}</p>
          </div>
          <button type="submit" disabled={sending || !file}
            className="bg-dotan-green-dark text-white px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
            <MdUploadFile /> {sending ? t.common.uploading : t.formats.uploadFormat}
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

      {/* Formats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((format) => {
          const cat = CATEGORIES[format.category] || CATEGORIES.general;
          const isDownloading = downloading === format.id;

          return (
            <div key={format.id} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint hover:shadow-md transition group">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                  {getFileIcon(format.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{format.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cat.bg} ${cat.color}`}>{cat.label}</span>
                  </div>
                  {format.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{format.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Avatar name={format.author.name} image={format.author.image} size="xs" />
                      <span>{format.author.name}</span>
                      <span>| {formatDate(format.createdAt)}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{getFileExtension(format.fileName)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleDownload(format)} disabled={isDownloading}
                        className="flex items-center gap-1 text-xs font-medium text-dotan-green-dark hover:text-dotan-green transition bg-dotan-mint-light px-3 py-1.5 rounded-lg disabled:opacity-50">
                        <MdDownload /> {isDownloading ? "..." : t.common.download}
                      </button>
                      {format.author.id === userId && (
                        <button onClick={() => handleDelete(format.id)}
                          className="text-red-400 hover:text-red-600 transition p-1.5 opacity-0 group-hover:opacity-100">
                          <MdDelete />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MdFolder className="text-5xl mx-auto mb-4 text-gray-300" />
          <p>{t.formats.noFormats} {filter !== "all" ? t.formats.inCategory : t.formats.yet}</p>
          <p className="text-sm mt-2">{t.formats.uploadHint}</p>
        </div>
      )}
    </div>
  );
}
