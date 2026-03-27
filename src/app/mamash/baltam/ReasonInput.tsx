"use client";

import type { useLanguage } from "@/i18n";

interface Props {
  reason: string;
  setReason: (s: string) => void;
  t: ReturnType<typeof useLanguage>["t"];
}

export default function ReasonInput({ reason, setReason, t }: Props) {
  return (
    <label>
      <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reason}</span>
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.mamash.reasonPlaceholder}
        className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
    </label>
  );
}
