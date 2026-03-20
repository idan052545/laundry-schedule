"use client";

import { MdTrendingUp, MdWarning, MdInfo } from "react-icons/md";
import Avatar from "@/components/Avatar";
import { UserMin } from "./constants";

interface FairnessPanelProps {
  fairnessData: (UserMin & { hours: number })[];
  avgHours: number;
}

export default function FairnessPanel({ fairnessData, avgHours }: FairnessPanelProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 mb-6 shadow-sm">
      <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
        <MdTrendingUp /> סיכום הוגנות - שעות לכל חייל
        <span className="text-[10px] text-amber-500 font-normal mr-auto">ממוצע: {avgHours.toFixed(1)} שעות</span>
      </h3>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {fairnessData.map(u => {
          const diff = u.hours - avgHours;
          const isHigh = diff > avgHours * 0.2;
          const isLow = diff < -avgHours * 0.2;
          return (
            <div key={u.id} className="flex items-center gap-2 text-xs">
              <Avatar name={u.name} image={u.image} size="xs" />
              <span className="font-medium text-gray-700 w-28 truncate">{u.name}</span>
              <div className="flex-1 bg-white rounded-full h-4 overflow-hidden border border-amber-100">
                <div className={`h-full rounded-full transition-all ${isHigh ? "bg-red-400" : isLow ? "bg-blue-400" : "bg-amber-400"}`}
                  style={{ width: `${Math.min((u.hours / (avgHours * 2)) * 100, 100)}%` }} />
              </div>
              <span className={`font-bold w-16 text-left ${isHigh ? "text-red-600" : isLow ? "text-blue-600" : "text-gray-600"}`}>
                {u.hours.toFixed(1)}h
              </span>
              {isHigh && <MdWarning className="text-red-400 shrink-0" title="מעל הממוצע" />}
              {isLow && <MdInfo className="text-blue-400 shrink-0" title="מתחת לממוצע" />}
            </div>
          );
        })}
      </div>
      {fairnessData.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-[11px] text-amber-700 font-medium">
            {fairnessData.filter(u => u.hours - avgHours > avgHours * 0.2).length > 0 && (
              <>חיילים עם עומס גבוה (אדום): שקלי להפחית שעות ב{fairnessData.filter(u => u.hours - avgHours > avgHours * 0.2).map(u => u.name).join(", ")}. </>
            )}
            {fairnessData.filter(u => u.hours - avgHours < -avgHours * 0.2).length > 0 && (
              <>חיילים עם עומס נמוך (כחול): אפשר להגדיל ל{fairnessData.filter(u => u.hours - avgHours < -avgHours * 0.2).map(u => u.name).join(", ")}.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
