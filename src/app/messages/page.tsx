"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { MdPushPin, MdDelete, MdAdd, MdClose, MdSend, MdImage, MdPerson, MdInbox } from "react-icons/md";
import Avatar from "@/components/Avatar";

interface Assignee {
  id: string;
  user: { id: string; name: string; image: string | null };
}

interface Message {
  id: string;
  title: string;
  content: string;
  imageData: string | null;
  pinned: boolean;
  createdAt: string;
  author: { id: string; name: string; image: string | null; role: string };
  assignees: Assignee[];
}

interface UserOption {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchMessages = useCallback(async () => {
    const param = tab === "mine" && userId ? `?assignedTo=${userId}` : "";
    const res = await fetch(`/api/messages${param}`);
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  }, [tab, userId]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users-birthdays");
    if (res.ok) {
      const data = await res.json();
      setAllUsers(data.map((u: UserOption) => ({ id: u.id, name: u.name, image: u.image, team: u.team })));
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") { fetchMessages(); fetchUsers(); }
  }, [status, router, fetchMessages, fetchUsers]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("assigneeIds", JSON.stringify(selectedAssignees));
    if (imageFile) formData.append("image", imageFile);

    const res = await fetch("/api/messages", { method: "POST", body: formData });
    if (res.ok) {
      setTitle(""); setContent(""); setImageFile(null); setImagePreview(null);
      setSelectedAssignees([]); setShowForm(false);
      await fetchMessages();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק הודעה זו?")) return;
    const res = await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredUsers = allUsers.filter((u) =>
    u.name.includes(assigneeSearch) && u.id !== userId
  );

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark">לוח הודעות</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 text-sm">
          {showForm ? <><MdClose /> סגור</> : <><MdAdd /> הודעה חדשה</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "all" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          כל ההודעות
        </button>
        <button onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${tab === "mine" ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          <MdInbox /> הודעות שלי
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm sm:text-base"
            placeholder="כותרת ההודעה" required />
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[100px] text-sm sm:text-base"
            placeholder="תוכן ההודעה..." required />

          {/* Image upload */}
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm text-gray-700">
              <MdImage /> צרף תמונה
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            {imagePreview && (
              <div className="mt-2 relative inline-block">
                <img src={imagePreview} alt="תצוגה מקדימה" className="max-h-[200px] rounded-lg border border-gray-200" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  <MdClose />
                </button>
              </div>
            )}
          </div>

          {/* Assignee picker */}
          <div>
            <button type="button" onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm text-gray-700">
              <MdPerson /> שייך לחיילים {selectedAssignees.length > 0 && `(${selectedAssignees.length})`}
            </button>

            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedAssignees.map((uid) => {
                  const u = allUsers.find((x) => x.id === uid);
                  return u ? (
                    <span key={uid} className="text-xs bg-dotan-mint-light text-dotan-green-dark px-2 py-1 rounded-full flex items-center gap-1">
                      {u.name}
                      <button type="button" onClick={() => toggleAssignee(uid)} className="hover:text-red-500"><MdClose /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {showAssigneePicker && (
              <div className="mt-2 border border-gray-200 rounded-lg p-3 max-h-[200px] overflow-y-auto bg-gray-50">
                <input type="text" value={assigneeSearch} onChange={(e) => setAssigneeSearch(e.target.value)}
                  placeholder="חיפוש..." className="w-full px-3 py-1.5 border border-gray-300 rounded-lg mb-2 text-sm outline-none" />
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)}
                      className={`w-full text-right flex items-center gap-2 p-1.5 rounded text-sm transition ${
                        selectedAssignees.includes(u.id) ? "bg-dotan-mint-light" : "hover:bg-gray-100"
                      }`}>
                      <Avatar name={u.name} image={u.image} size="sm" />
                      <span className="flex-1">{u.name}</span>
                      {selectedAssignees.includes(u.id) && <span className="text-dotan-green text-xs">V</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={sending}
            className="bg-dotan-green-dark text-white px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base">
            <MdSend /> {sending ? "שולח..." : "פרסם הודעה"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`bg-white p-4 sm:p-5 rounded-xl shadow-sm border ${msg.pinned ? "border-dotan-gold border-2" : "border-dotan-mint"}`}>
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={msg.author.name} image={msg.author.image} size="sm" />
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                    {msg.pinned && <MdPushPin className="text-dotan-gold shrink-0" />}
                    <span className="truncate">{msg.title}</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    {msg.author.name} | {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
              {(msg.author.id === userId) && (
                <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:text-red-600 transition shrink-0">
                  <MdDelete className="text-xl" />
                </button>
              )}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{msg.content}</p>

            {msg.imageData && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                <img src={msg.imageData} alt={msg.title} className="w-full max-h-[400px] object-cover" />
              </div>
            )}

            {msg.assignees.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1 items-center">
                <span className="text-xs text-gray-400 ml-1">משויך ל:</span>
                {msg.assignees.map((a) => (
                  <span key={a.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    {a.user.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {tab === "mine" ? (
              <>
                <MdInbox className="text-5xl mx-auto mb-4 text-gray-300" />
                <p>אין הודעות משויכות אליך</p>
              </>
            ) : (
              <>
                <MdAdd className="text-5xl mx-auto mb-4 text-gray-300" />
                <p>אין הודעות עדיין. היה הראשון לפרסם!</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
