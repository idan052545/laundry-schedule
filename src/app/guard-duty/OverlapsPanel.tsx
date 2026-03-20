"use client";

import { MdErrorOutline, MdCheck, MdWarning } from "react-icons/md";
import { Overlap, DutyTable } from "./constants";
import { useLanguage } from "@/i18n";

interface OverlapsPanelProps {
  overlaps: Overlap[];
  otherTable: DutyTable | null;
  tableType: string;
}

export default function OverlapsPanel({ overlaps, otherTable, tableType }: OverlapsPanelProps) {
  const { t } = useLanguage();
  const otherName = tableType === "guard" ? t.guardDuty.avs : t.guardDuty.guards;
  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-200 p-4 mb-6 shadow-sm">
      <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
        <MdErrorOutline /> {t.guardDuty.overlapCheck}
        <span className="text-[10px] text-red-500 font-normal me-auto">
          {overlaps.length === 0 ? t.guardDuty.noOverlaps : t.guardDuty.overlapsFound.replace("{n}", String(overlaps.length))}
        </span>
      </h3>
      {overlaps.length === 0 ? (
        <div className="text-center py-6">
          <MdCheck className="text-green-500 text-3xl mx-auto mb-2" />
          <p className="text-sm text-green-700 font-medium">{t.guardDuty.allClear}</p>
          {otherTable && <p className="text-[11px] text-gray-400 mt-1">{t.guardDuty.checkedAgainst} {otherName}</p>}
          {!otherTable && <p className="text-[11px] text-gray-400 mt-1">{t.guardDuty.noOtherTable} {otherName} {t.guardDuty.forThisDate}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {overlaps.map((o, i) => (
            <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${
              o.type === "cross-table"
                ? "bg-orange-50 border-orange-200"
                : "bg-red-50 border-red-200"
            }`}>
              <MdWarning className={`shrink-0 mt-0.5 ${o.type === "cross-table" ? "text-orange-500" : "text-red-500"}`} />
              <div>
                <span className="font-bold text-gray-800">{o.userName}</span>
                <span className={`text-[10px] me-2 px-1.5 py-0.5 rounded-full font-medium ${
                  o.type === "cross-table"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {o.type === "cross-table" ? t.guardDuty.crossTableOverlap : t.guardDuty.inTableOverlap}
                </span>
                <p className="text-gray-600 mt-0.5">{o.details.replace(/\[.*\]$/, "")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
