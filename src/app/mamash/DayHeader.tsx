"use client";

import { MdChevronRight, MdChevronLeft, MdToday, MdSync, MdPerson } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { israelToday } from "@/lib/israel-tz";
import type { MamashOverview } from "./types";

interface Props {
  date: string;
  setDate: (d: string) => void;
  team: number;
  data: MamashOverview | null;
  myUserId: string;
  onActivate: () => void;
  onDeactivate: () => void;
  onRefresh: () => void;
  acting: boolean;
}

export default function DayHeader({ date, setDate, team, data, myUserId, onActivate, onDeactivate, onRefresh, acting }: Props) {
  const { t } = useLanguage();
  const d = new Date(date + "T12:00:00");
  const isToday = date === israelToday();
  const isMamash = data?.activeMamash?.userId === myUserId;

  function shift(days: number) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    setDate(nd.toISOString().split("T")[0]);
  }

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2.5 sticky top-0 z-30">
      {/* Top: team badge + mamash toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-dotan-green/10 text-dotan-green-dark px-2 py-0.5 rounded-full">
            {t.mamash.title} · צוות {team}
          </span>
          {data?.activeMamash && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <MdPerson className="text-xs" />
              {data.activeMamash.user.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            disabled={acting}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <MdSync className={`text-base ${acting ? "animate-spin" : ""}`} />
          </button>
          {isMamash ? (
            <button
              onClick={onDeactivate}
              className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition"
            >
              {t.mamash.deactivate}
            </button>
          ) : (
            <button
              onClick={onActivate}
              className="text-[10px] font-bold text-dotan-green bg-dotan-green/10 px-2 py-1 rounded-lg hover:bg-dotan-green/20 transition"
            >
              {t.mamash.activate}
            </button>
          )}
        </div>
      </div>
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <MdChevronRight className="text-lg text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">
            {d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          {!isToday && (
            <button onClick={() => setDate(israelToday())} className="p-1 rounded hover:bg-gray-100">
              <MdToday className="text-sm text-dotan-green" />
            </button>
          )}
        </div>
        <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <MdChevronLeft className="text-lg text-gray-600" />
        </button>
      </div>
    </div>
  );
}
