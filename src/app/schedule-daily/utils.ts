import { ScheduleEvent, TimedGroup } from "./types";

export const formatTime = (dt: string) =>
  new Date(dt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });

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
