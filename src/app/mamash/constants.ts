import {
  MdPerson, MdChecklist, MdGpsFixed, MdForum, MdNewspaper,
  MdMic, MdDownload, MdLocalFireDepartment, MdCheckCircle,
  MdStar, MdLoop, MdEdit,
} from "react-icons/md";
import type { RequirementType } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REQ_TYPE_CONFIG: Record<RequirementType, { icon: any; color: string; bg: string; defaultDuration: number }> = {
  "status-meeting":      { icon: MdPerson,             color: "text-blue-600",    bg: "bg-blue-50",    defaultDuration: 10 },
  "plan-approval":       { icon: MdChecklist,           color: "text-indigo-600",  bg: "bg-indigo-50",  defaultDuration: 15 },
  "simulation":          { icon: MdGpsFixed,            color: "text-red-600",     bg: "bg-red-50",     defaultDuration: 20 },
  "feedback":            { icon: MdForum,               color: "text-green-600",   bg: "bg-green-50",   defaultDuration: 15 },
  "morning-talk":        { icon: MdNewspaper,           color: "text-amber-600",   bg: "bg-amber-50",   defaultDuration: 15 },
  "ted-debrief":         { icon: MdMic,                 color: "text-purple-600",  bg: "bg-purple-50",  defaultDuration: 25 },
  "experience-download": { icon: MdDownload,            color: "text-cyan-600",    bg: "bg-cyan-50",    defaultDuration: 15 },
  "scenario":            { icon: MdGpsFixed,            color: "text-orange-600",  bg: "bg-orange-50",  defaultDuration: 35 },
  "team-assessment":     { icon: MdLoop,                color: "text-teal-600",    bg: "bg-teal-50",    defaultDuration: 45 },
  "mamash-time":         { icon: MdStar,                color: "text-yellow-600",  bg: "bg-yellow-50",  defaultDuration: 25 },
  "hot-debrief":         { icon: MdLocalFireDepartment, color: "text-rose-600",    bg: "bg-rose-50",    defaultDuration: 15 },
  "checkpoint":          { icon: MdCheckCircle,         color: "text-emerald-600", bg: "bg-emerald-50", defaultDuration: 10 },
  "custom":              { icon: MdEdit,                color: "text-gray-600",    bg: "bg-gray-50",    defaultDuration: 15 },
};

export const SLOT_COLORS: Record<string, string> = {
  available: "bg-green-100",
  assigned: "bg-blue-200",
  "platoon-blocked": "bg-gray-300",
  duty: "bg-red-200",
  leave: "bg-yellow-200",
};

/** Generate 30-min time labels from 06:00 to 22:00 */
export function getTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

/** Get the Sunday of the current week (Israel week starts Sunday) */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}
