"use client";

import { useRef } from "react";
import { useLanguage } from "@/i18n";
import type { MemberAvailability } from "./types";
import { SLOT_COLORS, getTimeSlots } from "./constants";

interface Props {
  availability: MemberAvailability[];
}

export default function AvailabilityMatrix({ availability }: Props) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const slots = getTimeSlots();

  // Scroll to current time on mount
  const now = new Date();
  const currentSlotIdx = Math.max(0, Math.floor((now.getHours() - 6) * 2 + now.getMinutes() / 30));

  return (
    <div className="p-3">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {[
          { key: "available", label: t.mamash.available, color: "bg-green-100" },
          { key: "scheduling-window", label: t.mamash.schedulingWindow, color: "bg-emerald-200" },
          { key: "assigned", label: t.mamash.assigned, color: "bg-blue-200" },
          { key: "platoon-blocked", label: t.mamash.platoonBlocked, color: "bg-gray-200" },
          { key: "duty", label: t.mamash.duty, color: "bg-red-200" },
          { key: "leave", label: t.mamash.leave, color: "bg-yellow-200" },
        ].map(l => (
          <div key={l.key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span className="text-[10px] text-gray-600">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto -mx-3 px-3" ref={scrollRef}>
        <div className="min-w-[600px]">
          {/* Time header */}
          <div className="flex items-center border-b border-gray-200 pb-1 mb-1">
            <div className="w-20 shrink-0" />
            {slots.map((slot, i) => (
              <div key={slot} className={`flex-1 min-w-[28px] text-center ${i === currentSlotIdx ? "font-bold" : ""}`}>
                {slot.endsWith(":00") && (
                  <span className="text-[9px] text-gray-500" dir="ltr">{slot.split(":")[0]}</span>
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {availability.map(member => (
            <div key={member.user.id} className="flex items-center py-0.5 hover:bg-gray-50/50 transition">
              <div className="w-20 shrink-0 flex items-center gap-1.5 pr-1">
                {member.user.image ? (
                  <img src={member.user.image} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                    {member.user.name[0]}
                  </div>
                )}
                <span className="text-[10px] text-gray-700 truncate">{member.user.name.split(" ")[0]}</span>
              </div>
              {member.slots.map((slot, i) => (
                <div
                  key={slot.time}
                  className={`flex-1 min-w-[28px] h-6 ${SLOT_COLORS[slot.status] || "bg-gray-100"} ${
                    i === 0 ? "rounded-r" : i === member.slots.length - 1 ? "rounded-l" : ""
                  } border-l border-white/50 transition-colors`}
                  title={slot.eventTitle || slot.status}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {availability.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-500">
          <span>{availability.length} {t.mamash.teamMembers}</span>
          <span>·</span>
          <span>
            {availability.reduce((sum, m) => sum + m.slots.filter(s => s.status === "available").length, 0)} {t.mamash.availableSlots}
          </span>
        </div>
      )}
    </div>
  );
}
