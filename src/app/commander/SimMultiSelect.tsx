"use client";

import { useState } from "react";
import { MdCheckBox, MdSend } from "react-icons/md";
import { useLanguage } from "@/i18n";

export default function SimMultiSelect({ options, selected, onSubmit }: { options: string[]; selected: number[]; onSubmit: (sel: number[]) => void }) {
  const { t } = useLanguage();
  const [local, setLocal] = useState<number[]>(selected);
  const toggle = (i: number) => setLocal((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <button key={i} type="button" onClick={() => toggle(i)}
          className={`w-full text-start p-3 rounded-lg text-sm transition flex items-center gap-2 ${local.includes(i) ? "bg-purple-600 text-white" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"}`}>
          <MdCheckBox className={local.includes(i) ? "text-white" : "text-gray-300"} /> {opt}
        </button>
      ))}
      <button onClick={() => onSubmit(local)} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-purple-700 transition flex items-center justify-center gap-2">
        <MdSend /> {t.commander.send}
      </button>
    </div>
  );
}
