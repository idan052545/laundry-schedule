import type { SectionKey } from "./types";

export const SECTION_LABELS: Record<SectionKey, string> = {
  quote: "משפט היומי",
  schedule: 'לו"ז',
  duty: "תורנויות",
  teamSchedule: "לו\"ז צוות",
  notes: "הערות",
  tasks: "משימות",
  forms: "טפסים",
  surveys: "סקרים",
  birthdays: "ימי הולדת",
  messages: "הודעות",
  materials: "חומר מקצועי",
  commander: "מפקדים",
  vote: "איש השבוע",
  machines: "מכונות",
  chopal: 'חופ"ל',
  volunteers: "התנדבויות",
};

export const DEFAULT_VISIBLE: SectionKey[] = Object.keys(SECTION_LABELS) as SectionKey[];

export function loadVisibleSections(): Set<SectionKey> {
  if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE);
  try {
    const saved = localStorage.getItem("dashboard-sections");
    if (saved) return new Set(JSON.parse(saved) as SectionKey[]);
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE);
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
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

export function getTimeAgo(dateStr: string): string {
  const diffMin = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return "עכשיו";
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;
  return `לפני ${Math.floor(diffMin / 60)} שע׳`;
}
