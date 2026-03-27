"use client";

import Link from "next/link";
import type { DashboardFeed } from "../types";
import { displayName } from "@/lib/displayName";

interface DailyQuoteSectionProps {
  quote: NonNullable<DashboardFeed["dailyQuote"]>;
  locale: string;
  getTranslation: (text: string) => string;
}

export default function DailyQuoteSection({ quote, locale, getTranslation }: DailyQuoteSectionProps) {
  return (
    <Link href="/daily-quote" className="block bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-purple-100/60 rounded-2xl px-4 py-3.5 hover:shadow-md transition relative overflow-hidden">
      <div className="absolute top-1 left-2 text-6xl text-purple-100 font-serif leading-none select-none">&ldquo;</div>
      <p className="text-[13px] font-medium text-gray-700 leading-relaxed relative z-10">{getTranslation(quote.text)}</p>
      <span className="text-[10px] text-purple-400 mt-1.5 block relative z-10">— {displayName(quote.user, locale)}</span>
    </Link>
  );
}
