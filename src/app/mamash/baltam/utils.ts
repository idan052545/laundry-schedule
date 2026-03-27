import { israelDate } from "@/lib/israel-tz";

export function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}

export function toLocalISO(date: string, time: string) {
  return israelDate(date, time).toISOString();
}

export function addMinutesToISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}
