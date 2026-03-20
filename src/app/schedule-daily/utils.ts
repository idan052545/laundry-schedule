import { ScheduleEvent, TimedGroup } from "./types";

/**
 * Check if a user's name appears in an event title.
 * Handles Hebrew naming conventions where titles contain comma-separated names.
 * For "עידן חן סימנטוב" matches: "עידן", "עידן סימנטוב", "עידן ס", "עידן ח", etc.
 * Only matches first name alone if it's unique enough (no ambiguity needed).
 */
export const isNameInTitle = (title: string, fullName: string): boolean => {
  if (!fullName || fullName.length < 2) return false;
  const parts = fullName.split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 0) return false;

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  // For names like "עידן חן סימנטוב", middle names exist
  const lastInitial = lastName[0];

  // Check combinations from most specific to least:
  // 1. Full name
  if (parts.length > 1 && title.includes(fullName)) return true;
  // 2. First + last name (skip middle): "עידן סימנטוב"
  if (parts.length > 2 && title.includes(`${firstName} ${lastName}`)) return true;
  // 3. First name + last initial: "עידן ס"
  if (parts.length > 1 && title.includes(`${firstName} ${lastInitial}`)) return true;
  // 4. First name + middle name initial (for 3+ part names): "עידן ח"
  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i++) {
      if (title.includes(`${firstName} ${parts[i][0]}`)) return true;
    }
  }
  // 5. First name alone — but only if >= 2 chars
  if (firstName.length >= 2 && title.includes(firstName)) return true;

  return false;
};

export const formatTime = (dt: string) =>
  new Date(dt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

/** Check if two ISO date strings fall on different calendar days (in Israel timezone) */
export const isCrossDay = (startIso: string, endIso: string): boolean => {
  const startDate = new Date(startIso).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const endDate = new Date(endIso).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  return startDate !== endDate;
};

/** Format end time with "+1" suffix if event crosses midnight */
export const formatEndTime = (startIso: string, endIso: string): string => {
  const time = formatTime(endIso);
  return isCrossDay(startIso, endIso) ? `${time} (+1)` : time;
};

export const formatDateDisplay = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

export const toISO = (dateStr: string, timeStr: string) =>
  new Date(`${dateStr}T${timeStr}:00`).toISOString();

export const getDurationMin = (event: ScheduleEvent) =>
  Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000);

export const isEventNow = (event: ScheduleEvent, isToday: boolean) => {
  if (!isToday) return false;
  const now = Date.now();
  return now >= new Date(event.startTime).getTime() && now <= new Date(event.endTime).getTime();
};

const MAX_GROUP_SIZE = 2;

export const groupTimedEvents = (timedEvents: ScheduleEvent[]): TimedGroup[] => {
  const groups: TimedGroup[] = [];
  timedEvents.forEach((event, idx) => {
    const evStart = new Date(event.startTime).getTime();
    const evEnd = new Date(event.endTime).getTime();
    // Find an overlapping group that still has room
    const group = groups.find((g) => {
      if (g.events.length >= MAX_GROUP_SIZE) return false;
      const gStart = new Date(g.startTime).getTime();
      const gEnd = new Date(g.endTime).getTime();
      return evStart < gEnd && evEnd > gStart;
    });
    if (group) {
      group.events.push({ event, idx });
      if (event.startTime < group.startTime) group.startTime = event.startTime;
      if (event.endTime > group.endTime) group.endTime = event.endTime;
    } else {
      groups.push({ startTime: event.startTime, endTime: event.endTime, events: [{ event, idx }] });
    }
  });
  return groups;
};
