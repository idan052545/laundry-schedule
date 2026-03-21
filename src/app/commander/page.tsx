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
  MdMessage,
  MdArrowBack,
  MdCalendarToday,
  MdBuild,
} from "react-icons/md";
import Avatar from "@/components/Avatar";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";
import SimulationsSurveys from "./SimulationsSurveys";
import { Commander, CommanderPost, getPostTypeConfig } from "./types";

function CommanderPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const { t, dateLocale, locale } = useLanguage();

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

  const postTypeConfig = getPostTypeConfig(t);

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
  }, [status, router, fetchCommanders, fetchPosts, selectedId]);  const handleSubmit = async (e: React.FormEvent) => {
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
    if (!confirm(t.commander.deletePost)) return;
    const res = await fetch(`/api/commander-posts?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchPosts();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (status === "loading" || loading) return <InlineLoading />;

  // Commander list view
  if (!selectedId) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-4 sm:mb-6 flex items-center gap-3">
          <MdStar className="text-dotan-gold" />
          {t.commander.title}
        </h1>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">{t.commander.selectCommander}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {commanders.map((cmd) => (
            <button key={cmd.id} onClick={() => router.push(`/commander?id=${cmd.id}`)}
              className="text-start bg-white p-4 sm:p-5 rounded-xl shadow-sm border-2 border-dotan-mint hover:border-dotan-gold hover:shadow-md transition group">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar name={cmd.name} image={cmd.image} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-base sm:text-lg group-hover:text-dotan-green-dark transition truncate">{displayName(cmd, locale)}</h3>
                  {cmd.roleTitle && <span className="text-xs sm:text-sm text-dotan-green font-medium">{cmd.roleTitle}</span>}
                  <div className="text-xs text-gray-400 mt-1">{cmd._count.commanderPosts} {t.commander.nPosts}</div>
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
  const isKlap = commander?.roleTitle?.includes("קלפ");
  const isSimulations = commander?.roleTitle?.includes("סימולציות");

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
              <h1 className="text-xl sm:text-2xl font-bold text-dotan-green-dark truncate">{displayName(commander, locale)}</h1>
              {commander.roleTitle && <span className="text-xs sm:text-sm text-dotan-green font-medium">{commander.roleTitle}</span>}
            </div>
          </div>
        )}
        <div className="flex gap-2 shrink-0">
          {isKlap && (
            <button onClick={() => router.push("/issues")}
              className="bg-amber-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-amber-600 transition font-medium flex items-center gap-1 sm:gap-2 text-sm">
              <MdBuild /> {t.commander.issuesTab}
            </button>
          )}
          {(selectedId === userId || isCommanderUser) && selectedId === userId && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-dotan-green-dark text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 sm:gap-2 text-sm">
              {showForm ? <><MdClose /> {t.common.close}</> : <><MdAdd /> {t.commander.newPost}</>}
            </button>
          )}
        </div>
      </div>

      {/* Post Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-dotan-mint mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(postTypeConfig).map(([key, { label, icon: Icon }]) => (
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
            placeholder={t.commander.postTitle} required />
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none min-h-[100px] text-sm sm:text-base"
            placeholder={t.commander.postContent} required />
          {postType === "image" && (
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder={t.commander.imageUrl} dir="ltr" />
          )}
          {(postType === "task" || postType === "reminder") && (
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm" />
          )}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-dotan-green focus:ring-dotan-green" />
              <MdPushPin className="text-dotan-gold" /> {t.commander.pinToTop}
            </label>
            <button type="submit" disabled={sending}
              className="bg-dotan-green-dark text-white px-5 sm:px-6 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base">
              <MdSend /> {sending ? t.common.sending : t.commander.publishPost}
            </button>
          </div>
        </form>
      )}

      {/* Inline Surveys Section */}
      {isSimulations && userId && selectedId && (
        <div className="mb-6 bg-purple-50/50 rounded-xl border border-purple-100 p-4">
          <SimulationsSurveys userId={userId} commanderId={selectedId} isCommander={selectedId === userId} />
        </div>
      )}

      {/* Posts */}
      <div className="space-y-3 sm:space-y-4">
        {posts.map((post) => {
          const config = postTypeConfig[post.type] || postTypeConfig.message;
          const IconComp = config.icon;
          return (
            <div key={post.id} className={`bg-white p-4 sm:p-5 rounded-xl shadow-sm border-2 ${post.pinned ? "border-dotan-gold" : "border-gray-100"}`}>
              <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${config.bg} ${config.color}`}>
                    <IconComp className="inline text-xs ms-0.5" /> {config.label}
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
                  <MdCalendarToday /> {t.commander.deadlineDate} {formatDate(post.dueDate)}
                </div>
              )}
              <div className="mt-2 sm:mt-3 text-xs text-gray-400">{formatDate(post.createdAt)}</div>
            </div>
          );
        })}
        {posts.length === 0 && !isSimulations && (
          <div className="text-center py-12 text-gray-500">
            <MdMessage className="text-5xl mx-auto mb-4 text-gray-300" />
            <p>{t.commander.noPosts}</p>
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
