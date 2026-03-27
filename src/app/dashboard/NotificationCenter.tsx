"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MdNotifications, MdExpandMore, MdExpandLess,
  MdDoneAll, MdClose, MdAdd, MdRemove, MdEdit, MdCalendarMonth, MdChevronLeft,
} from "react-icons/md";
import TranslateButton, { useTranslation } from "@/components/TranslateButton";
import type { Notification } from "./types";
import { getNotificationHref, getTimeAgo } from "./constants";
import { useLanguage } from "@/i18n";

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

/** Parse schedule change body into structured items */
function parseScheduleBody(body: string): { type: "add" | "remove" | "update"; text: string; time?: string }[] {
  const items: { type: "add" | "remove" | "update"; text: string; time?: string }[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const timeMatch = trimmed.match(/\(([^)]+)\)\s*$/);
    const time = timeMatch?.[1];
    let text = timeMatch ? trimmed.slice(0, timeMatch.index).trim() : trimmed;
    if (trimmed.startsWith("➕") || trimmed.startsWith("חדש:")) {
      text = text.replace(/^➕\s*/, "").replace(/^חדש:\s*/, "");
      items.push({ type: "add", text, time });
    } else if (trimmed.startsWith("➖") || trimmed.startsWith("בוטל:")) {
      text = text.replace(/^➖\s*/, "").replace(/^בוטל:\s*/, "");
      items.push({ type: "remove", text, time });
    } else if (trimmed.startsWith("✏️") || trimmed.startsWith("שינוי:")) {
      text = text.replace(/^✏️\s*/, "").replace(/^שינוי:\s*/, "");
      items.push({ type: "update", text, time });
    }
  }
  return items;
}

function ScheduleChangeCard({ items }: { items: ReturnType<typeof parseScheduleBody> }) {
  const added = items.filter(i => i.type === "add");
  const removed = items.filter(i => i.type === "remove");
  const updated = items.filter(i => i.type === "update");

  return (
    <div className="mt-1.5 space-y-1">
      {updated.map((item, i) => (
        <div key={`u-${i}`} className="flex items-center gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5">
          <MdEdit className="text-amber-500 text-xs shrink-0" />
          <span className="text-[11px] text-amber-800 flex-1">{item.text}</span>
          {item.time && <span className="text-[10px] text-amber-500 font-mono shrink-0" dir="ltr">{item.time}</span>}
        </div>
      ))}
      {added.map((item, i) => (
        <div key={`a-${i}`} className="flex items-center gap-2 bg-green-50 rounded-lg px-2.5 py-1.5">
          <MdAdd className="text-green-600 text-xs shrink-0" />
          <span className="text-[11px] text-green-800 flex-1">{item.text}</span>
          {item.time && <span className="text-[10px] text-green-500 font-mono shrink-0" dir="ltr">{item.time}</span>}
        </div>
      ))}
      {removed.map((item, i) => (
        <div key={`r-${i}`} className="flex items-center gap-2 bg-red-50 rounded-lg px-2.5 py-1.5">
          <MdRemove className="text-red-500 text-xs shrink-0" />
          <span className="text-[11px] text-red-700 flex-1 line-through opacity-70">{item.text}</span>
          {item.time && <span className="text-[10px] text-red-400 font-mono shrink-0 line-through" dir="ltr">{item.time}</span>}
        </div>
      ))}
    </div>
  );
}

function NotificationItem({
  n, expanded, onToggle, onClose, getTranslation, t,
}: {
  n: Notification;
  expanded: boolean;
  onToggle: () => void;
  onClose?: () => void;
  getTranslation: (text: string) => string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const href = getNotificationHref(n.url, n.tag);
  const timeAgo = getTimeAgo(t, n.createdAt);
  const isScheduleChange = n.body.includes("➕") || n.body.includes("➖") || n.body.includes("✏️") || n.body.includes("חדש:") || n.body.includes("בוטל:");
  const scheduleItems = isScheduleChange ? parseScheduleBody(n.body) : [];

  return (
    <div className={`rounded-xl border transition-all ${
      !n.read ? "border-blue-200 bg-blue-50/30" : "border-gray-100 bg-white"
    }`}>
      {/* Header — always visible, tap to expand */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-start"
      >
        <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isScheduleChange && <MdCalendarMonth className="text-xs text-blue-500 shrink-0" />}
            <span className="text-xs font-bold text-gray-800 truncate">{getTranslation(n.title)}</span>
          </div>
          {!expanded && (
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {isScheduleChange
                ? scheduleItems.map(i => (i.type === "add" ? "+" : i.type === "remove" ? "−" : "~") + " " + i.text).join(" · ")
                : getTranslation(n.body).replace(/\n/g, " · ")}
            </p>
          )}
        </div>
        <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 -mt-1">
          {isScheduleChange && scheduleItems.length > 0 ? (
            <ScheduleChangeCard items={scheduleItems} />
          ) : (
            <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap mr-4">{getTranslation(n.body)}</p>
          )}
          <Link
            href={href}
            onClick={onClose}
            className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition"
          >
            <MdChevronLeft className="text-xs" />
            {isScheduleChange ? t.dashNotifications.goToSchedule : t.dashNotifications.goToPage}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function NotificationCenter({ notifications, setNotifications }: NotificationCenterProps) {
  const { t } = useLanguage();
  const { translateTexts, getTranslation, isEnglish } = useTranslation();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Auto-expand when there are unread notifications
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Auto-open on first load if there are unread
  useEffect(() => {
    if (unreadCount > 0) setOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand the newest unread notification
  useEffect(() => {
    if (open && unreadCount > 0 && !expandedId) {
      const newest = notifications.find(n => !n.read);
      if (newest) setExpandedId(newest.id);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEnglish && notifications.length > 0) {
      translateTexts(notifications.flatMap(n => [n.title, n.body]));
    }
  }, [isEnglish, notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  if (notifications.length === 0) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
          <MdNotifications className="text-lg text-gray-300" />
          <span className="text-xs text-gray-400">{t.dashNotifications.noNew}</span>
        </div>
      </div>
    );
  }

  const INLINE_LIMIT = 4;
  const showInline = notifications.slice(0, INLINE_LIMIT);
  const hasMore = notifications.length > INLINE_LIMIT;

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <>
      <div className="mb-3">
        {/* Header bar */}
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 transition border ${
            unreadCount > 0
              ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
              : "bg-white border-gray-200 hover:shadow-sm"
          }`}
        >
          <div className="relative">
            <MdNotifications className={`text-lg ${unreadCount > 0 ? "text-blue-500" : "text-gray-400"}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className={`text-xs font-bold flex-1 text-start ${unreadCount > 0 ? "text-blue-800" : "text-gray-700"}`}>
            {unreadCount > 0
              ? `${unreadCount} ${t.dashNotifications.unread}`
              : `${notifications.length} ${t.dashNotifications.lastDay}`}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); markAllRead(); }}
              className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 font-medium px-1.5 py-0.5 rounded-md hover:bg-blue-100 transition"
            >
              <MdDoneAll className="text-xs" /> {t.dashNotifications.markAll}
            </button>
          )}
          {open ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-400" />}
        </button>

        {/* Inline notification list */}
        {open && (
          <div className="mt-1.5 space-y-1.5">
            {showInline.map(n => (
              <NotificationItem
                key={n.id}
                n={n}
                expanded={expandedId === n.id}
                onToggle={() => setExpandedId(expandedId === n.id ? null : n.id)}
                getTranslation={getTranslation}
                t={t}
              />
            ))}
            {hasMore && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
              >
                <MdExpandMore className="text-sm" />
                {t.dashNotifications.showAll} ({notifications.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Full modal — only for overflow */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-gray-50 w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MdNotifications className="text-lg text-blue-500" />
                <span className="text-sm font-bold text-gray-800">{t.dashboard.notifications}</span>
                <span className="text-[10px] text-gray-400">{t.dashNotifications.last24h}</span>
                {isEnglish && notifications.length > 0 && (
                  <TranslateButton
                    size="sm"
                    texts={notifications.flatMap(n => [n.title, n.body])}
                    onTranslated={() => translateTexts(notifications.flatMap(n => [n.title, n.body]))}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-dotan-green hover:text-dotan-green-dark font-medium">
                    <MdDoneAll className="text-xs" /> {t.dashNotifications.markAll}
                  </button>
                )}
                <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <MdClose className="text-lg" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  expanded={expandedId === n.id}
                  onToggle={() => setExpandedId(expandedId === n.id ? null : n.id)}
                  onClose={() => setShowModal(false)}
                  getTranslation={getTranslation}
                  t={t}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
