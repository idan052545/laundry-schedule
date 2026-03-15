"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import {
  MdStar,
  MdPushPin,
  MdDelete,
  MdAdd,
  MdClose,
  MdSend,
  MdImage,
  MdAssignment,
  MdNotifications,
  MdMessage,
  MdArrowBack,
  MdCalendarToday,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";

interface Commander {
  id: string;
  name: string;
  image: string | null;
  roleTitle: string | null;
  role: string;
  _count: { commanderPosts: number };
}

interface CommanderPost {
  id: string;
  type: string;
  title: string;
  content: string;
  imageUrl: string | null;
  pinned: boolean;
  dueDate: string | null;
  createdAt: string;
  author: { id: string; name: string; image: string | null; roleTitle: string | null };
}

const POST_TYPE_CONFIG: Record<string, { label: string; icon: typeof MdMessage; color: string; bg: string }> = {
  message: { label: "הודעה", icon: MdMessage, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  task: { label: "משימה", icon: MdAssignment, color: "text-dotan-green", bg: "bg-dotan-mint-light border-dotan-green" },
  reminder: { label: "תזכורת", icon: MdNotifications, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  image: { label: "תמונה", icon: MdImage, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
};

function CommanderPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [posts, setPosts] = useState<CommanderPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState("message");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sending, setSending] = useState(false);

  const userId = session?.user ? (session.user as { id: string }).id : null;
  const isCommanderUser = commanders.some((c) => c.id === userId);

  const fetchCommanders = useCallback(async () => {
    const res = await fetch("/api/commanders");
    if (res.ok) setCommanders(await res.json());
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    const res = await fetch(`/api/commander-posts?authorId=${selectedId}`);
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetchCommanders();
      if (selectedId) fetchPosts();
      else setLoading(false);
    }
  }, [status, router, fetchCommanders, fetchPosts, selectedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/commander-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: postType, title, content, imageUrl: imageUrl || null, pinned, dueDate: dueDate || null }),
    });
    if (res.ok) {
      setTitle(""); setContent(""); setImageUrl(""); setDueDate(""); setPinned(false); setShowForm(false);
      await fetchPosts();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק פוסט זה?")) return;
    const res = await fetch(`/api/commander-posts?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchPosts();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  // Commander list view
  if (!selectedId) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-4 sm:mb-6 flex items-center gap-3">
          <MdStar className="text-dotan-gold" />
          לוח מפקדים
        </h1>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">בחר מפקד/ת כדי לראות את לוח ההודעות שלהם</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {commanders.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => router.push(`/commander?id=${cmd.id}`)}
              className="text-right bg-white p-4 sm:p-5 rounded-xl shadow-sm border-2 border-dotan-mint hover:border-dotan-gold hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar name={cmd.name} image={cmd.image} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-base sm:text-lg group-hover:text-dotan-green-dark transition truncate">{cmd.name}</h3>
                  {cmd.roleTitle && (
                    <span className="text-xs sm:text-sm text-dotan-green font-medium">{cmd.roleTitle}</span>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {cmd._count.commanderPosts} פוסטים
                  </div>
                </div>
                <MdStar className="text-dotan-gold text-2xl opacity-0 group-hover:opacity-100 transition shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Individual commander wall
  const commander = commanders.find((c) => c.id === selectedId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <button onClick={() => router.push("/commander")} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <MdArrowBack className="text-xl text-gray-600" />
        </button>
        {commander && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar name={commander.name} image={commander.image} size="md" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-dotan-green-dark truncate">{commander.name}</h1>
              {commander.roleTitle && <span className="text-xs sm:text-sm text-dotan-green font-medium">{commander.roleTitle}</span>}
            </div>
          </div>
        )}
        {(selectedId === userId || isCommanderUser) && selectedId === userId && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-dotan-green-dark text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 sm:gap-2 text-sm shrink-0">
            {showForm ? <><MdClose /> סגור</> : <><MdAdd /> פוסט חדש</>}
          </button>
        )}
      </div>

      {/* Post Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(POST_TYPE_CONFIG).map(([key, { label, icon: Icon, color }]) => (
              <button key={key} type="button" onClick={() => setPostType(key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  postType === key ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                <Icon /> {label}
              </button>
            ))}
          </div>

          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm sm:text-base"
            placeholder="כותרת" required />

          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[100px] text-sm sm:text-base"
            placeholder="תוכן..." required />

          {postType === "image" && (
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder="קישור לתמונה (URL)" dir="ltr" />
          )}

          {(postType === "task" || postType === "reminder") && (
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm" />
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-dotan-green focus:ring-dotan-green" />
              <MdPushPin className="text-dotan-gold" /> הצמד למעלה
            </label>
            <button type="submit" disabled={sending}
              className="bg-dotan-green-dark text-white px-5 sm:px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base">
              <MdSend /> {sending ? "שולח..." : "פרסם"}
            </button>
          </div>
        </form>
      )}

      {/* Posts */}
      <div className="space-y-3 sm:space-y-4">
        {posts.map((post) => {
          const config = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.message;
          const IconComp = config.icon;
          return (
            <div key={post.id} className={`bg-white p-4 sm:p-5 rounded-xl shadow-sm border-2 ${post.pinned ? "border-dotan-gold" : "border-gray-100"}`}>
              <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${config.bg} ${config.color}`}>
                    <IconComp className="inline text-xs ml-0.5" /> {config.label}
                  </span>
                  {post.pinned && <MdPushPin className="text-dotan-gold shrink-0" />}
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{post.title}</h3>
                </div>
                {post.author.id === userId && (
                  <button onClick={() => handleDelete(post.id)} className="text-red-400 hover:text-red-600 transition shrink-0">
                    <MdDelete className="text-xl" />
                  </button>
                )}
              </div>

              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{post.content}</p>

              {post.imageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                  <img src={post.imageUrl} alt={post.title} className="w-full max-h-[400px] object-cover" />
                </div>
              )}

              {post.dueDate && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-flex">
                  <MdCalendarToday /> דדליין: {formatDate(post.dueDate)}
                </div>
              )}

              <div className="mt-2 sm:mt-3 text-xs text-gray-400">
                {formatDate(post.createdAt)}
              </div>
            </div>
          );
        })}

        {posts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MdMessage className="text-5xl mx-auto mb-4 text-gray-300" />
            <p>אין פוסטים עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommanderPage() {
  return (
    <Suspense fallback={<InlineLoading />}>
      <CommanderPageContent />
    </Suspense>
  );
}
