"use client";

import { MdChevronRight, MdChevronLeft, MdToday } from "react-icons/md";
import { formatDateDisplay } from "./utils";

interface DateNavigationProps {
  date: string;
  isToday: boolean;
  onChangeDate: (delta: number) => void;
  onGoToToday: () => void;
}

export default function DateNavigation({ date, isToday, onChangeDate, onGoToToday }: DateNavigationProps) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-dotan-mint p-2.5 mb-3">
      <button onClick={() => onChangeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
        <MdChevronRight className="text-xl" />
      </button>
      <div className="text-center">
        <div className="font-bold text-gray-800 text-sm sm:text-base">{formatDateDisplay(date)}</div>
        {!isToday && (
          <button onClick={onGoToToday} className="text-xs text-dotan-green hover:underline flex items-center gap-1 mx-auto mt-0.5">
            <MdToday /> חזרה להיום
          </button>
        )}
      </div>
      <button onClick={() => onChangeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
        <MdChevronLeft className="text-xl" />
      </button>
    </div>
  );
}
