"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MdNotifications, MdExpandMore, MdExpandLess, MdChevronLeft,
  MdDoneAll, MdClose,
} from "react-icons/md";
import TranslateButton, { useTranslation } from "@/components/TranslateButton";
import type { Notification } from "./types";
import { getNotificationHref, getTimeAgo } from "./constants";
import { useLanguage } from "@/i18n";

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
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
          <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
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
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {notifications.map(n => {
                const href = getNotificationHref(n.url, n.tag);
                const timeAgo = getTimeAgo(t, n.createdAt);
                const isScheduleChange = n.tag?.startsWith("schedule-sync") || n.body.includes("עודכנו:") || n.body.includes("נוספו:") || n.body.includes("הוסרו:");

                return (
                  <div key={n.id} className={`px-4 py-3 ${!n.read ? "bg-blue-50/40" : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{getTranslation(n.title)}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                        </div>

                        {isScheduleChange ? (
                          <div className="mt-1.5 space-y-1">
                            {n.body.split("\n").map((line, i) => {
                              const trimmed = line.trim();
                              if (!trimmed) return null;
                              if (trimmed === "עודכנו:") return <div key={i} className="text-[10px] font-bold text-amber-600 mt-1">{t.dashNotifications.updated}</div>;
                              if (trimmed === "נוספו:") return <div key={i} className="text-[10px] font-bold text-green-600 mt-1">{t.dashNotifications.added}</div>;
                              if (trimmed === "הוסרו:") return <div key={i} className="text-[10px] font-bold text-red-600 mt-1">{t.dashNotifications.removed}</div>;
                              if (trimmed.startsWith("✏️")) return <div key={i} className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-100">{trimmed}</div>;
                              if (trimmed.startsWith("➕")) return <div key={i} className="text-[11px] text-green-800 bg-green-50 rounded-lg px-2 py-1 border border-green-100">{trimmed}</div>;
                              if (trimmed.startsWith("➖")) return <div key={i} className="text-[11px] text-red-800 bg-red-50 rounded-lg px-2 py-1 border border-red-100">{trimmed}</div>;
                              // Legacy format
                              const parts = trimmed.split(" | ");
                              return (
                                <div key={i}>
                                  {parts.map((part, pi) => {
                                    const p = part.trim();
                                    if (p.startsWith("עודכנו:")) return (
                                      <div key={`${i}-${pi}`}>
                                        <div className="text-[10px] font-bold text-amber-600 mt-1">{t.dashNotifications.updated}</div>
                                        {p.replace("עודכנו:", "").split(",").map((item, ii) => item.trim() && (
                                          <div key={ii} className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-100 mt-0.5">✏️ {item.trim()}</div>
                                        ))}
                                      </div>
                                    );
                                    if (p.startsWith("נוספו:")) return (
                                      <div key={`${i}-${pi}`}>
                                        <div className="text-[10px] font-bold text-green-600 mt-1">{t.dashNotifications.added}</div>
                                        {p.replace("נוספו:", "").split(",").map((item, ii) => item.trim() && (
                                          <div key={ii} className="text-[11px] text-green-800 bg-green-50 rounded-lg px-2 py-1 border border-green-100 mt-0.5">➕ {item.trim()}</div>
                                        ))}
                                      </div>
                                    );
                                    if (p.startsWith("הוסרו:")) return (
                                      <div key={`${i}-${pi}`}>
                                        <div className="text-[10px] font-bold text-red-600 mt-1">{t.dashNotifications.removed}</div>
                                        {p.replace("הוסרו:", "").split(",").map((item, ii) => item.trim() && (
                                          <div key={ii} className="text-[11px] text-red-800 bg-red-50 rounded-lg px-2 py-1 border border-red-100 mt-0.5">➖ {item.trim()}</div>
                                        ))}
                                      </div>
                                    );
                                    return <p key={`${i}-${pi}`} className="text-[11px] text-gray-600">{p}</p>;
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap">{getTranslation(n.body)}</p>
                        )}

                        <Link
                          href={href}
                          onClick={() => setShowNotifModal(false)}
                          className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg bg-dotan-green-dark/10 text-[10px] font-bold text-dotan-green-dark hover:bg-dotan-green-dark/20 transition"
                        >
                          <MdChevronLeft className="text-xs" />
                          {isScheduleChange ? t.dashNotifications.goToSchedule : t.dashNotifications.goToPage}
                        </Link>
                      </div>
                    </div>
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
