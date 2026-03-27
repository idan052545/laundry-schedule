"use client";

import Link from "next/link";
import { MdMessage } from "react-icons/md";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface LatestMessageSectionProps {
  latestMessage: NonNullable<DashboardFeed["latestMessage"]>;
  locale: string;
  t: ReturnType<typeof useLanguage>["t"];
  getTranslation: (text: string) => string;
}

export default function LatestMessageSection({ latestMessage, locale, getTranslation }: LatestMessageSectionProps) {
  return (
    <Link href="/messages" className="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-3.5 py-2.5 hover:shadow-md transition">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
        <MdMessage className="text-sm text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-gray-800 truncate block">{getTranslation(latestMessage.title)}</span>
        <span className="text-[10px] text-blue-500">{displayName(latestMessage.author, locale)}</span>
      </div>
    </Link>
  );
}
