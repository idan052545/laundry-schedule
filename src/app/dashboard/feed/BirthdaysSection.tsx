"use client";

import Link from "next/link";
import { MdCake } from "react-icons/md";
import Avatar from "@/components/Avatar";
import type { DashboardFeed } from "../types";
import { useLanguage } from "@/i18n";
import { displayName } from "@/lib/displayName";

interface BirthdaysSectionProps {
  birthdayUsers: DashboardFeed["birthdayUsers"];
  locale: string;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function BirthdaysSection({ birthdayUsers, locale, t }: BirthdaysSectionProps) {
  return (
    <Link href="/birthdays" className="flex items-center gap-3 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl px-3.5 py-3 hover:shadow-md transition">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-sm shrink-0">
        <MdCake className="text-lg text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-pink-400 font-bold block">{t.birthdays.birthdayToday}!</span>
        <span className="text-xs font-semibold text-pink-700 truncate block">{birthdayUsers.map((u) => displayName(u, locale)).join(", ")}</span>
      </div>
      <div className="flex -space-x-1.5 shrink-0">
        {birthdayUsers.slice(0, 3).map((u) => (
          <Avatar key={u.id} name={u.name} image={u.image} size="xs" />
        ))}
      </div>
    </Link>
  );
}
