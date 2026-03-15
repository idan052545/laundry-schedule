const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

function parseICS(content) {
  const events = [];
  const lines = content.split("\n").map((l) => l.replace(/\r$/, ""));

  let inEvent = false;
  let event = {};
  let lastKey = "";

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      event = {};
      lastKey = "";
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      events.push(event);
      continue;
    }
    if (!inEvent) continue;

    // Handle folded lines (continuation with space/tab)
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (lastKey && event[lastKey]) {
        event[lastKey] += line.substring(1);
      }
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    let key = line.substring(0, colonIdx);
    const value = line.substring(colonIdx + 1);

    // Handle params like DTSTART;VALUE=DATE:20260309
    const semiIdx = key.indexOf(";");
    if (semiIdx !== -1) {
      const params = key.substring(semiIdx + 1);
      key = key.substring(0, semiIdx);
      if (params.includes("VALUE=DATE")) {
        event[key + "_DATEONLY"] = true;
      }
    }

    event[key] = value;
    lastKey = key;
  }

  return events;
}

function parseDateTime(dtStr, isDateOnly) {
  if (isDateOnly) {
    // YYYYMMDD
    const y = dtStr.substring(0, 4);
    const m = dtStr.substring(4, 6);
    const d = dtStr.substring(6, 8);
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }
  // YYYYMMDDTHHMMSSZ
  const y = dtStr.substring(0, 4);
  const m = dtStr.substring(4, 6);
  const d = dtStr.substring(6, 8);
  const h = dtStr.substring(9, 11);
  const min = dtStr.substring(11, 13);
  const s = dtStr.substring(13, 15);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
}

function guessType(summary) {
  const s = summary.toLowerCase();
  if (s.includes("ארוחת") || s.includes("אוכל") || s.includes("מטבח")) return "meal";
  if (s.includes("אימון") || s.includes("כושר") || s.includes("ספורט")) return "training";
  if (s.includes("טקס") || s.includes("מסדר")) return "ceremony";
  if (s.includes("זמן אישי") || s.includes("זמן פנוי") || s.includes("זמן חופשי") || s.includes("זמן רוחב")) return "free";
  return "general";
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/import-ics.js <path-to-ics>");
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const events = parseICS(content);

  console.log(`Parsed ${events.length} events`);

  // Filter out birthday events and past events
  const cutoff = new Date("2026-03-15T00:00:00Z");
  const filtered = events.filter((e) => {
    const summary = (e.SUMMARY || "").toLowerCase();
    // Skip birthdays
    if (summary.includes("יום הולדת")) return false;
    // Parse start time
    const start = parseDateTime(e.DTSTART, !!e.DTSTART_DATEONLY);
    return start >= cutoff;
  });

  console.log(`${filtered.length} future non-birthday events to import`);

  // Clear existing schedule events
  await prisma.scheduleAssignee.deleteMany();
  await prisma.scheduleEvent.deleteMany();
  console.log("Cleared existing events");

  let imported = 0;
  for (const e of filtered) {
    const isDateOnly = !!e.DTSTART_DATEONLY;
    const start = parseDateTime(e.DTSTART, isDateOnly);
    const end = e.DTEND ? parseDateTime(e.DTEND, isDateOnly) : start;
    const summary = e.SUMMARY || "";
    const description = (e.DESCRIPTION || "").replace(/\\n/g, "\n").replace(/\\,/g, ",");

    // Guess target from description
    let target = "all";
    const descLower = description.toLowerCase();
    if (descLower.includes("צוות 14") && !descLower.includes("צוות 15")) target = "team-14";
    else if (descLower.includes("צוות 15") && !descLower.includes("צוות 14")) target = "team-15";
    else if (descLower.includes("צוות 16") && !descLower.includes("צוות 17")) target = "team-16";
    else if (descLower.includes("צוות 17") && !descLower.includes("צוות 16")) target = "team-17";

    await prisma.scheduleEvent.create({
      data: {
        title: summary,
        description: description || null,
        startTime: start,
        endTime: end,
        allDay: isDateOnly,
        target,
        type: guessType(summary),
      },
    });
    imported++;
  }

  console.log(`Imported ${imported} events`);
  await prisma.$disconnect();
}

main().catch(console.error);
