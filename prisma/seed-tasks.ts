import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: Date;
  dtend: Date | null;
  allDay: boolean;
}

function parseICSDate(dateStr: string): { date: Date; allDay: boolean } {
  dateStr = dateStr.trim();
  // VALUE=DATE: format - all day event
  if (dateStr.includes("VALUE=DATE:")) {
    const d = dateStr.split("VALUE=DATE:")[1];
    const year = parseInt(d.substring(0, 4));
    const month = parseInt(d.substring(4, 6)) - 1;
    const day = parseInt(d.substring(6, 8));
    return { date: new Date(year, month, day), allDay: true };
  }
  // Regular datetime: 20260301T213000
  const clean = dateStr.replace("DTSTART:", "").replace("DTEND:", "");
  const year = parseInt(clean.substring(0, 4));
  const month = parseInt(clean.substring(4, 6)) - 1;
  const day = parseInt(clean.substring(6, 8));
  const hour = parseInt(clean.substring(9, 11));
  const min = parseInt(clean.substring(11, 13));
  return { date: new Date(year, month, day, hour, min), allDay: false };
}

function categorizeEvent(summary: string): { category: string; priority: string } {
  if (summary.includes("דדליין")) return { category: "deadline", priority: "urgent" };
  if (summary.includes("תזכורת") || summary.includes("עוד") && summary.includes("ימים")) return { category: "reminder", priority: "high" };
  if (summary.includes("הגשה")) return { category: "deadline", priority: "high" };
  if (summary.includes("אקטואליה יומית")) return { category: "daily", priority: "normal" };
  if (summary.includes("שבועי") || summary.includes("שבוע")) return { category: "weekly", priority: "normal" };
  if (summary.includes("קריאה") || summary.includes("לימוד") || summary.includes("ללמוד")) return { category: "weekly", priority: "normal" };
  return { category: "task", priority: "normal" };
}

function cleanSummary(summary: string): string {
  // Remove emoji prefixes
  return summary.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]+/gu, "").trim();
}

function parseICS(content: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const eventBlocks = content.split("BEGIN:VEVENT");

  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i].split("END:VEVENT")[0];
    const lines = block.split("\n").map((l) => l.trim());

    let uid = "";
    let summary = "";
    let description = "";
    let dtstart = "";
    let dtend = "";

    for (const line of lines) {
      if (line.startsWith("UID:")) uid = line.substring(4);
      else if (line.startsWith("SUMMARY:")) summary = line.substring(8);
      else if (line.startsWith("DTSTART")) dtstart = line;
      else if (line.startsWith("DTEND")) dtend = line;
      else if (line.startsWith("DESCRIPTION:")) description = line.substring(12).replace(/\\,/g, ",").replace(/\\n/g, "\n");
    }

    if (!summary || !dtstart) continue;

    const start = parseICSDate(dtstart);
    const end = dtend ? parseICSDate(dtend) : null;

    events.push({
      uid,
      summary,
      description,
      dtstart: start.date,
      dtend: end?.date || null,
      allDay: start.allDay,
    });
  }

  return events;
}

async function main() {
  // Clear existing tasks
  await prisma.task.deleteMany();

  const icsPath = path.join(__dirname, "..", "..", "לוח_משימות_ותזכורות_בהד.ics");
  const content = fs.readFileSync(icsPath, "utf-8");
  const events = parseICS(content);

  console.log(`Parsed ${events.length} events from ICS file`);

  // Deduplicate by uid
  const uniqueEvents = new Map<string, ICSEvent>();
  for (const event of events) {
    if (!uniqueEvents.has(event.uid)) {
      uniqueEvents.set(event.uid, event);
    }
  }

  console.log(`${uniqueEvents.size} unique events after dedup`);

  let count = 0;
  for (const event of uniqueEvents.values()) {
    const { category, priority } = categorizeEvent(event.summary);
    const title = cleanSummary(event.summary);

    await prisma.task.create({
      data: {
        title,
        description: event.description || null,
        category,
        startDate: event.dtstart,
        endDate: event.dtend,
        allDay: event.allDay,
        priority,
        recurring: false,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} tasks`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
