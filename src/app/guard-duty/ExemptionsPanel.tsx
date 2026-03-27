"use client";

import { useState } from "react";
import { MdShield, MdExpandMore, MdExpandLess } from "react-icons/md";
import { EXEMPTIONS, ExemptionInfo } from "./constants";
import { useLanguage } from "@/i18n";

export default function ExemptionsPanel() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  // Group by type
  const grouped = EXEMPTIONS.reduce<Record<string, ExemptionInfo[]>>((acc, e) => {
    if (!acc[e.type]) acc[e.type] = [];
    acc[e.type].push(e);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <MdShield className="text-red-400 text-sm" />
          {t.guardDuty.exemptions} <span className="text-[10px] font-normal text-gray-400">({EXEMPTIONS.length})</span>
        </span>
        {open ? <MdExpandLess className="text-gray-400" /> : <MdExpandMore className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-3">
          {Object.entries(grouped).map(([type, people]) => (
            <div key={type}>
              <div className="text-[10px] font-bold text-gray-500 mb-1.5 border-b border-gray-100 pb-1">{type}</div>
              <div className="flex flex-wrap gap-1.5">
                {people.map((p) => (
                  <span
                    key={p.name}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium ${p.color}`}
                    title={p.detail}
                  >
                    {p.name}
                    <span className="opacity-60 text-[9px]">— {p.detail}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
