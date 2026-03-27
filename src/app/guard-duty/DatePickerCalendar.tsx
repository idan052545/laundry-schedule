"use client";

import { useState } from "react";
import { MdChevronRight, MdChevronLeft, MdSecurity, MdVisibility } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface DatePickerCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  availableDates: string[];
  tableType: "guard" | "obs" | "kitchen";
}

const HE_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const EN_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePickerCalendar({ selectedDate, onSelectDate, availableDates, tableType }: DatePickerCalendarProps) {
  const { t, locale } = useLanguage();
  const isHe = locale === "he";
  const dayLabels = isHe ? HE_DAYS : EN_DAYS;

  const sel = new Date(selectedDate + "T12:00:00");
  const [viewMonth, setViewMonth] = useState(sel.getMonth());
  const [viewYear, setViewYear] = useState(sel.getFullYear());

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

  const availSet = new Set(availableDates);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    isHe ? "he-IL" : "en-US",
    { month: "long", year: "numeric" }
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function toStr(day: number) {
    return `${viewYear}-${(viewMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 mb-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><MdChevronRight className="text-lg" /></button>
        <span className="text-sm font-bold text-gray-800">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><MdChevronLeft className="text-lg" /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayLabels.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="h-9" />;
          const dateStr = toStr(day);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasTable = availSet.has(dateStr);
          const isPast = new Date(dateStr + "T12:00:00") < new Date(todayStr + "T00:00:00");

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`relative h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                isSelected
                  ? "bg-dotan-green-dark text-white ring-2 ring-dotan-gold/40 shadow-sm"
                  : isToday
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : isPast
                      ? "text-gray-300 hover:bg-gray-50"
                      : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {day}
              {hasTable && !isSelected && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  tableType === "guard" ? "bg-dotan-green" : "bg-amber-500"
                }`} />
              )}
              {hasTable && isSelected && (
                <MdVisibility className="absolute -top-1 -right-1 text-[10px] text-white bg-dotan-green rounded-full p-0.5 w-3.5 h-3.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-dotan-green" />
          {t.guardDuty.guards}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {t.guardDuty.avs}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-200" />
          {isHe ? "היום" : "Today"}
        </div>
      </div>
    </div>
  );
}
