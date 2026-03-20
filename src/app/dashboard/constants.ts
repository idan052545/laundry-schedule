import type { SectionKey } from "./types";
import type { Dictionary } from "@/i18n";

export const getSectionLabels = (t: Dictionary): Record<SectionKey, string> => ({
  quote: t.dashboard.sectionQuote,
  schedule: t.dashboard.sectionSchedule,
  duty: t.dashboard.sectionDuty,
  teamSchedule: t.dashboard.sectionTeamSchedule,
  notes: t.dashboard.sectionNotes,
  tasks: t.dashboard.sectionTasks,
  forms: t.dashboard.sectionForms,
  surveys: t.dashboard.sectionSurveys,
  birthdays: t.dashboard.sectionBirthdays,
  messages: t.dashboard.sectionMessages,
  materials: t.dashboard.sectionMaterials,
  commander: t.dashboard.sectionCommander,
  vote: t.dashboard.sectionVote,
  machines: t.dashboard.sectionMachines,
  chopal: t.dashboard.sectionChopal,
  volunteers: t.dashboard.sectionVolunteers,
});

export const DEFAULT_VISIBLE: SectionKey[] = [
  "quote", "schedule", "duty", "teamSchedule", "notes", "tasks", "forms",
  "surveys", "birthdays", "messages", "materials", "commander", "vote",
  "machines", "chopal", "volunteers",
];

export function loadVisibleSections(): Set<SectionKey> {
  if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE);
  try {
    const saved = localStorage.getItem("dashboard-sections");
    if (saved) return new Set(JSON.parse(saved) as SectionKey[]);
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE);
}

export function getGreeting(t: Dictionary): string {
  const h = new Date().getHours();
  if (h < 6) return t.greetings.night;
  if (h < 12) return t.greetings.morning;
  if (h < 17) return t.greetings.afternoon;
  if (h < 21) return t.greetings.evening;
  return t.greetings.night;
}

export function getNotificationHref(url: string | null, tag: string | null): string {
  if (tag?.startsWith("survey-new-") && url?.startsWith("/commander")) return "/surveys?tab=platoon";
  if (tag?.startsWith("survey-remind-") && url?.startsWith("/commander")) return "/surveys?tab=platoon";
  if (url) return url;
  if (tag?.startsWith("form-")) return "/forms";
  if (tag?.startsWith("issue-")) return "/issues";
  if (tag?.startsWith("schedule-")) return "/schedule-daily";
  if (tag?.startsWith("note-")) return "/schedule-daily";
  if (tag?.startsWith("survey-")) return "/surveys";
  if (tag?.startsWith("commander-")) return "/commander";
  if (tag?.startsWith("material-")) return "/materials";
  if (tag?.startsWith("format-")) return "/formats";
  if (tag?.startsWith("attendance-")) return "/attendance";
  if (tag?.startsWith("chopal-")) return "/chopal";
  if (tag?.startsWith("aktualia-")) return "/aktualia";
  if (tag?.startsWith("message-")) return "/messages";
  if (tag?.startsWith("task-")) return "/tasks";
  if (tag?.startsWith("admin-")) return "/dashboard";
  if (tag?.startsWith("guard-") || tag?.startsWith("duty-")) return "/guard-duty";
  return "/dashboard";
}

export function getTimeAgo(t: Dictionary, dateStr: string): string {
  const diffMin = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return t.timeAgo.now;
  if (diffMin < 60) return t.timeAgo.minutesAgo.replace("{n}", String(diffMin));
  return t.timeAgo.hoursAgo.replace("{n}", String(Math.floor(diffMin / 60)));
}
