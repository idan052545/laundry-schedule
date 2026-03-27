import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { israelDate, israelDayRange } from "@/lib/israel-tz";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

/**
 * Patterns that are ALWAYS schedulable — these are inherently free time
 * where the ממ״ש can schedule team activities.
 * (Assignees still get 15-20 min for meals — enforced at scheduling time.)
 */
const ALWAYS_SCHEDULABLE_PATTERNS = [
  /חל["״]ז/i,                   // חל״ז תכנים מחייבים
  /זמני?\s*חניכה/i,             // זמני חניכה / עע / לע
  /זמן\s*סימולציו/i,           // זמן סימולציות
  /עצור\s*אמצע/i,              // עצור אמצע צוותי
  /חסום/i,                       // חסום (blocked for team use)
  /שיבוץ\s*ע["״]י\s*ממ/i,     // שיבוץ ע״י ממשים
  /הפסקה/i,                     // הפסקה (break)
  /ארוחה/i,                     // ארוחה (meal - generic)
  /ארוחת\s*(בוקר|צהר|ערב)/i,  // ארוחת בוקר/צהריים/ערב
];

/**
 * Normalize a platoon event title for matching:
 * strip leading time patterns (e.g. "17:40-18:40|"), trim, collapse spaces
 */
function normalizeTitle(title: string): string {
  return title
    .replace(/^\d{1,2}[:.]\d{2}[-–]\d{1,2}[:.]\d{2}\s*[|]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Auto-detect which platoon event titles are schedulable
 * by analyzing historical overlap with ALL team events in the past 30 days.
 */
async function getAutoDetectedSchedulableTitles(): Promise<Set<string>> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [platoon, teamEvents] = await Promise.all([
    prisma.scheduleEvent.findMany({
      where: { target: "all", allDay: false, startTime: { gte: thirtyDaysAgo } },
      select: { title: true, startTime: true, endTime: true },
    }),
    prisma.scheduleEvent.findMany({
      where: {
        target: { startsWith: "team-" },
        allDay: false,
        startTime: { gte: thirtyDaysAgo },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  // Count overlap by normalized title
  const totalByTitle = new Map<string, number>();
  const overlapByTitle = new Map<string, number>();

  for (const pe of platoon) {
    const key = normalizeTitle(pe.title);
    totalByTitle.set(key, (totalByTitle.get(key) || 0) + 1);
    const hasOverlap = teamEvents.some(
      t => t.startTime < pe.endTime && t.endTime > pe.startTime
    );
    if (hasOverlap) {
      overlapByTitle.set(key, (overlapByTitle.get(key) || 0) + 1);
    }
  }

  const schedulable = new Set<string>();
  for (const [title, total] of totalByTitle) {
    const overlapped = overlapByTitle.get(title) || 0;
    // If teams scheduled over this event type >30% of the time, it's schedulable
    if (overlapped / total > 0.3) {
      schedulable.add(title);
    }
  }

  return schedulable;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const teamParam = searchParams.get("team");

  if (!dateStr) return NextResponse.json({ error: "חסר תאריך" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true, role: true, email: true } });
  const team = teamParam ? Number(teamParam) : user?.team;
  if (!team) return NextResponse.json({ error: "חסר צוות" }, { status: 400 });

  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";

  const activeMamash = await prisma.mamashRole.findFirst({
    where: { team, active: true },
    include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true } } },
  });
  if (!isAdmin && activeMamash?.userId !== userId) {
    return NextResponse.json({ error: "אין הרשאה — רק ממ״ש פעיל או מפקד" }, { status: 403 });
  }

  const { dayStart, dayEnd } = israelDayRange(dateStr);
  const weekStart = getWeekStart(new Date(dateStr));

  // Parallel fetches — including overrides and auto-detect
  const [
    events, teamMembers, dutyAssignments, chopalRequests,
    requirements, changelog, overrides, autoSchedulable,
  ] = await Promise.all([
    prisma.scheduleEvent.findMany({
      where: {
        startTime: { lte: dayEnd },
        endTime: { gt: dayStart },
        target: { in: ["all", `team-${team}`] },
      },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true } } },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.user.findMany({
      where: { team, role: { not: "sagal" } },
      select: { id: true, name: true, nameEn: true, image: true, team: true },
      orderBy: { name: "asc" },
    }),
    prisma.dutyAssignment.findMany({
      where: { table: { date: dateStr } },
      select: { userId: true, timeSlot: true },
    }),
    prisma.chopalRequest.findMany({
      where: { date: dateStr, needed: true },
      select: { userId: true },
    }),
    prisma.scheduleRequirement.findMany({
      where: { team, weekStart },
      include: {
        targetUser: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scheduleChange.findMany({
      where: { team, date: dateStr },
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Manual overrides for this team
    prisma.eventOverride.findMany({
      where: { team },
      select: { eventId: true, schedulable: true },
    }),
    // Auto-detected schedulable titles from historical overlap
    getAutoDetectedSchedulableTitles(),
  ]);

  // Build override map: eventId -> schedulable
  const overrideMap = new Map(overrides.map(o => [o.eventId, o.schedulable]));

  // 3-tier classification: override > auto-detect > legacy regex
  function isSchedulable(eventId: string, title: string): boolean {
    // 1. Manual override
    if (overrideMap.has(eventId)) return overrideMap.get(eventId)!;
    // 2. Auto-detect from historical overlap
    const norm = normalizeTitle(title);
    if (autoSchedulable.has(norm)) return true;
    // 3. Always-schedulable patterns (breaks, meals, scheduling windows)
    return ALWAYS_SCHEDULABLE_PATTERNS.some(p => p.test(title));
  }

  // Build classification map for the response — only for platoon events
  const classification: Record<string, boolean> = {};
  const platoonEvents = events.filter(e => e.target === "all" && !e.allDay);
  for (const e of platoonEvents) {
    classification[e.id] = isSchedulable(e.id, e.title);
  }

  const blockingPlatoon = platoonEvents.filter(e => !classification[e.id]);
  const teamEvents = events.filter(e => e.target === `team-${team}` && !e.allDay);
  const chopalUserIds = new Set(chopalRequests.map(c => c.userId));
  const dutyByUser = new Map<string, string[]>();
  for (const da of dutyAssignments) {
    if (!dutyByUser.has(da.userId)) dutyByUser.set(da.userId, []);
    dutyByUser.get(da.userId)!.push(da.timeSlot);
  }

  // Time slots: 06:00 to 22:00 in 30-min increments
  const slots: string[] = [];
  for (let h = 6; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }

  function slotToUTC(hh: number, mm: number): Date {
    return israelDate(dateStr!, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  const availability = teamMembers.map(member => {
    const memberSlots = slots.map(slotTime => {
      const [sh, sm] = slotTime.split(":").map(Number);
      const slotStart = slotToUTC(sh, sm);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      if (chopalUserIds.has(member.id)) {
        return { time: slotTime, status: "leave" as const };
      }

      const memberDuty = dutyByUser.get(member.id);
      if (memberDuty?.some(ts => ts === slotTime || ts.startsWith(slotTime.split(":")[0]))) {
        return { time: slotTime, status: "duty" as const };
      }

      const platoonHit = platoonEvents.find(e => {
        const es = new Date(e.startTime);
        const ee = new Date(e.endTime);
        return es < slotEnd && ee > slotStart;
      });
      if (platoonHit) {
        const teamBlock = teamEvents.find(e => {
          const es = new Date(e.startTime);
          const ee = new Date(e.endTime);
          return es < slotEnd && ee > slotStart && e.assignees.some(a => a.userId === member.id);
        });
        if (teamBlock) {
          return { time: slotTime, status: "assigned" as const, eventTitle: teamBlock.title };
        }
        if (classification[platoonHit.id]) {
          return { time: slotTime, status: "scheduling-window" as const, eventTitle: platoonHit.title };
        }
        return { time: slotTime, status: "platoon-blocked" as const, eventTitle: platoonHit.title, overridable: true };
      }

      const teamBlock = teamEvents.find(e => {
        const es = new Date(e.startTime);
        const ee = new Date(e.endTime);
        return es < slotEnd && ee > slotStart && e.assignees.some(a => a.userId === member.id);
      });
      if (teamBlock) {
        return { time: slotTime, status: "assigned" as const, eventTitle: teamBlock.title };
      }

      return { time: slotTime, status: "available" as const };
    });

    return { user: member, slots: memberSlots };
  });

  // Free slots: windows where no HARD BLOCK platoon event exists
  const freeSlots: { start: string; end: string; durationMin: number }[] = [];
  let freeStart: string | null = null;
  for (let i = 0; i < slots.length; i++) {
    const slotTime = slots[i];
    const [sh, sm] = slotTime.split(":").map(Number);
    const slotStart = slotToUTC(sh, sm);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

    const blocked = blockingPlatoon.some(e => {
      const es = new Date(e.startTime);
      const ee = new Date(e.endTime);
      return es < slotEnd && ee > slotStart;
    });

    if (!blocked) {
      if (!freeStart) freeStart = slotTime;
    } else {
      if (freeStart) {
        freeSlots.push({ start: freeStart, end: slotTime, durationMin: (i - slots.indexOf(freeStart)) * 30 });
        freeStart = null;
      }
    }
  }
  if (freeStart) {
    freeSlots.push({ start: freeStart, end: "22:00", durationMin: (slots.length - slots.indexOf(freeStart)) * 30 });
  }

  return NextResponse.json({
    events,
    teamMembers,
    availability,
    freeSlots,
    requirements,
    changelog,
    classification,
    activeMamash: activeMamash ? { id: activeMamash.id, userId: activeMamash.userId, user: activeMamash.user } : null,
  });
}
