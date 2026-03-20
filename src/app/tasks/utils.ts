import { MONTHS_HE } from "./constants";

export function toLocalKey(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
}

export const TODAY_KEY = toLocalKey(new Date());

export function isToday(ds: string) { return toLocalKey(new Date(ds)) === TODAY_KEY; }

export function isPast(ds: string) { return new Date(ds) < new Date(); }

export function formatTime(ds: string, locale = "he-IL") {
  return new Date(ds).toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jerusalem"});
}

export function formatDate(ds: string, months?: string[]) {
  const d = new Date(ds);
  const m = months || MONTHS_HE;
  return `${d.getDate()} ${m[d.getMonth()]}`;
}

export function formatRelative(ds: string, todayLabel = "היום", tomorrowLabel = "מחר", months?: string[]) {
  const tom = new Date(); tom.setDate(tom.getDate()+1);
  if (isToday(ds)) return todayLabel;
  if (toLocalKey(tom) === toLocalKey(new Date(ds))) return tomorrowLabel;
  return formatDate(ds, months);
}

export function daysUntil(ds: string) {
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(ds); target.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export function getWeekDates(offset: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + offset * 7);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return {
    start, end,
    startStr: toLocalKey(start),
    endStr: toLocalKey(end),
  };
}
