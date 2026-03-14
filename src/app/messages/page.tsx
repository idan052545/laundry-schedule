"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MdPushPin, MdDelete, MdAdd, MdClose, MdSend } from "react-icons/md";
import Avatar from "@/components/Avatar";

interface Message {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  author: { id: string; name: string; image: string | null; role: string };
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const userId = session?.user ? (session.user as { id: string }).id : null;

  const fetchMessages = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchMessages();
  }, [status, router, fetchMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      setTitle(""); setContent(""); setShowForm(false);
      await fetchMessages();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק הודעה זו?")) return;
    const res = await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchMessages();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-xl text-gray-500">טוען...</div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dotan-green-dark">לוח הודעות</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2">
          {showForm ? <><MdClose /> סגור</> : <><MdAdd /> הודעה חדשה</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-dotan-mint mb-6 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none"
            placeholder="כותרת ההודעה" required />
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[120px]"
            placeholder="תוכן ההודעה..." required />
          <button type="submit" disabled={sending}
            className="bg-dotan-green-dark text-white px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50">
            <MdSend /> {sending ? "שולח..." : "פרסם הודעה"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`bg-white p-5 rounded-xl shadow-sm border ${msg.pinned ? "border-dotan-gold border-2" : "border-dotan-mint"}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <Avatar name={msg.author.name} image={msg.author.image} size="sm" />
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {msg.pinned && <MdPushPin className="text-dotan-gold" />}
                    {msg.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {msg.author.name} | {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
              {(msg.author.id === userId) && (
                <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:text-red-600 transition">
                  <MdDelete className="text-xl" />
                </button>
              )}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MdAdd className="text-5xl mx-auto mb-4 text-gray-300" />
            <p>אין הודעות עדיין. היה הראשון לפרסם!</p>
          </div>
        )}
      </div>
    </div>
  );
}
