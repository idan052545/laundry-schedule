"use client";

import Link from "next/link";
import { MdPushPin } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface CommanderPinnedSectionProps {
  pinnedPosts: DashboardFeed["pinnedPosts"];
  locale: string;
  dateLocale: string;
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function CommanderPinnedSection({ pinnedPosts, locale, dateLocale, getTranslation }: CommanderPinnedSectionProps) {
  return (
    <div className="space-y-2">
      {pinnedPosts.map((post) => (
        <Link key={post.id} href="/commander" className="flex items-center gap-2.5 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-100 rounded-2xl px-3.5 py-2.5 hover:shadow-md transition">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm shrink-0">
            <MdPushPin className="text-sm text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-gray-800 truncate block">{getTranslation(post.title)}</span>
            <span className="text-[10px] text-yellow-600">
              {displayName(post.author, locale)}
              {post.dueDate && <> · {new Date(post.dueDate + "T12:00:00").toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}</>}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
