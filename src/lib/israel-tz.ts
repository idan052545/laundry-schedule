/**
 * Israel timezone helpers.
 *
 * Israel alternates between IST (UTC+2) and IDT (UTC+3).
 * These helpers dynamically resolve the correct offset for any date,
 * so callers never hardcode +02:00 or +03:00.
 */

const IL_TZ = "Asia/Jerusalem";

/**
 * Returns "+02:00" or "+03:00" depending on whether `date` falls in
 * Israel Standard Time or Israel Daylight Time.
 */
export function israelOffset(date: Date = new Date()): string {
  // Intl gives us the UTC offset in minutes via formatToParts
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: IL_TZ,
    timeZoneName: "longOffset", // e.g. "GMT+03:00"
  });
  const parts = fmt.formatToParts(date);
  const tzPart = parts.find(p => p.type === "timeZoneName");
  // tzPart.value = "GMT+03:00" or "GMT+02:00"
  if (tzPart?.value) {
    const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
    if (match) return match[1];
  }
  // Fallback: compute manually
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const ilStr = date.toLocaleString("en-US", { timeZone: IL_TZ });
  const diffMs = new Date(ilStr).getTime() - new Date(utcStr).getTime();
  const diffMin = Math.round(diffMs / 60000);
  const sign = diffMin >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(diffMin) / 60)).padStart(2, "0");
  const m = String(Math.abs(diffMin) % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

/**
 * Build a Date from a YYYY-MM-DD date string and optional HH:MM time,
 * interpreted in Israel timezone.
 *
 * israelDate("2026-03-27")                → midnight Israel time
 * israelDate("2026-03-27", "14:30")       → 14:30 Israel time
 * israelDate("2026-03-27", "23:59:59")    → end of day Israel time
 */
export function israelDate(dateStr: string, time = "00:00:00"): Date {
  // Ensure time has seconds
  const t = time.includes(":") && time.split(":").length === 2 ? time + ":00" : time;
  // We need the offset for this specific date — use a rough estimate first
  const rough = new Date(`${dateStr}T${t}+03:00`);
  const offset = israelOffset(rough);
  return new Date(`${dateStr}T${t}${offset}`);
}

/**
 * Get today's date string (YYYY-MM-DD) in Israel timezone.
 */
export function israelToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: IL_TZ });
}

/**
 * Get Israel day boundaries (start/end) as UTC Dates for DB queries.
 */
export function israelDayRange(dateStr: string): { dayStart: Date; dayEnd: Date } {
  return {
    dayStart: israelDate(dateStr, "00:00:00"),
    dayEnd: israelDate(dateStr, "23:59:59"),
  };
}
