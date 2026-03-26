"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MdNotifications, MdExpandMore, MdExpandLess, MdChevronLeft,
  MdDoneAll, MdClose, MdAdd, MdRemove, MdEdit, MdCalendarMonth,
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
    // Extract time from parentheses at end: "... (12:30–13:00)" or "... (12:00–13:00 ← 12:15–13:15)"
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
    <div className="mt-2 space-y-1.5">
      {updated.length > 0 && updated.map((item, i) => (
        <div key={`u-${i}`} className="flex items-center gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
          <MdEdit className="text-amber-500 text-sm shrink-0" />
          <span className="text-[11px] text-amber-800 flex-1">{item.text}</span>
          {item.time && <span className="text-[10px] text-amber-500 font-mono shrink-0" dir="ltr">{item.time}</span>}
        </div>
      ))}
      {added.length > 0 && (
        <div className="bg-green-50 rounded-lg border border-green-100 overflow-hidden">
          {added.map((item, i) => (
            <div key={`a-${i}`} className={`flex items-center gap-2 px-2.5 py-1.5 ${i > 0 ? "border-t border-green-100" : ""}`}>
              <MdAdd className="text-green-600 text-sm shrink-0" />
              <span className="text-[11px] text-green-800 flex-1">{item.text}</span>
              {item.time && <span className="text-[10px] text-green-500 font-mono shrink-0" dir="ltr">{item.time}</span>}
            </div>
          ))}
        </div>
      )}
      {removed.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-100 overflow-hidden">
          {removed.map((item, i) => (
            <div key={`r-${i}`} className={`flex items-center gap-2 px-2.5 py-1.5 ${i > 0 ? "border-t border-red-100" : ""}`}>
              <MdRemove className="text-red-500 text-sm shrink-0" />
              <span className="text-[11px] text-red-700 flex-1 line-through opacity-70">{item.text}</span>
              {item.time && <span className="text-[10px] text-red-400 font-mono shrink-0 line-through" dir="ltr">{item.time}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationCenter({ notifications, setNotifications }: NotificationCenterProps) {
  const { t } = useLanguage();
  const { translateTexts, getTranslation, isEnglish } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (isEnglish && notifications.length > 0) {
      translateTexts(notifications.flatMap(n => [n.title, n.body]));
    }
  }, [isEnglish, notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="mb-3">
        <button
          onClick={() => notifications.length > 0 ? setShowNotifications(!showNotifications) : undefined}
          className="w-full flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:shadow-sm transition"
        >
          <div className="relative">
            <MdNotifications className={`text-lg ${unreadCount > 0 ? "text-blue-500" : "text-gray-400"}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-gray-700 flex-1 text-start">
            {notifications.length > 0 ? `${notifications.length} ${t.dashNotifications.lastDay}` : t.dashNotifications.noNew}
          </span>
          {notifications.length > 0 && (showNotifications ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-400" />)}
        </button>
        {/* Compact inline preview — max 2 notifications */}
        {showNotifications && notifications.length > 0 && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {notifications.slice(0, 2).map(n => {
                const href = getNotificationHref(n.url, n.tag);
                const timeAgo = getTimeAgo(t, n.createdAt);
                return (
                  <Link key={n.id} href={href} className={`flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 transition ${!n.read ? "bg-blue-50/40" : ""}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-800 truncate">{getTranslation(n.title)}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mt-0.5">{getTranslation(n.body).replace(/\n/g, " · ")}</p>
                    </div>
                    <MdChevronLeft className="text-gray-300 mt-1.5 shrink-0" />
                  </Link>
                );
              })}
            </div>
            {/* Show all button */}
            <button
              onClick={() => { setShowNotifications(false); setShowNotifModal(true); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-gray-100 bg-gray-50 text-xs font-bold text-dotan-green-dark hover:bg-gray-100 transition"
            >
              <MdExpandMore className="text-sm" />
              {t.dashNotifications.showAll} ({notifications.length})
            </button>
          </div>
        )}
      </div>

      {/* Notifications full modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowNotifModal(false)}>
          <div className="bg-gray-50 w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
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
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={async () => {
                      await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                    className="flex items-center gap-1 text-[10px] text-dotan-green hover:text-dotan-green-dark font-medium"
                  >
                    <MdDoneAll className="text-xs" /> {t.dashNotifications.markAll}
                  </button>
                )}
                <button onClick={() => setShowNotifModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <MdClose className="text-lg" />
                </button>
              </div>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.map(n => {
                const href = getNotificationHref(n.url, n.tag);
                const timeAgo = getTimeAgo(t, n.createdAt);
                const isScheduleChange = n.body.includes("➕") || n.body.includes("➖") || n.body.includes("✏️") || n.body.includes("חדש:") || n.body.includes("בוטל:");
                const scheduleItems = isScheduleChange ? parseScheduleBody(n.body) : [];

                return (
                  <div key={n.id} className={`bg-white rounded-xl border p-3 transition ${!n.read ? "border-blue-200 shadow-sm" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                        {isScheduleChange && <MdCalendarMonth className="text-sm text-blue-500 shrink-0" />}
                        <span className="text-xs font-bold text-gray-800 truncate">{getTranslation(n.title)}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                    </div>

                    {isScheduleChange && scheduleItems.length > 0 ? (
                      <>
                        <ScheduleChangeCard items={scheduleItems} />
                        <Link href={href} onClick={() => setShowNotifModal(false)}
                          className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition">
                          <MdChevronLeft className="text-xs" /> {t.dashNotifications.goToSchedule}
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">{getTranslation(n.body)}</p>
                        <Link href={href} onClick={() => setShowNotifModal(false)}
                          className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition">
                          <MdChevronLeft className="text-xs" /> {t.dashNotifications.goToPage}
                        </Link>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
