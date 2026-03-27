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
 * Platoon events whose titles match these patterns are SCHEDULING WINDOWS —
 * the ממ״ש is expected to place team events inside them.
 * Everything else is a hard block.
 */
const SCHEDULING_WINDOW_PATTERNS = [
  /חל["״]ז/i,                   // חל״ז תכנים מחייבים
  /זמני?\s*חניכה/i,             // זמני חניכה / עע / לע
  /זמן\s*סימולציו/i,           // זמן סימולציות
  /עצור\s*אמצע/i,              // עצור אמצע צוותי
  /חסום/i,                       // חסום (blocked for team use)
  /שיבוץ\s*ע["״]י\s*ממ/i,     // שיבוץ ע״י ממשים
];

function isSchedulingWindow(title: string): boolean {
  return SCHEDULING_WINDOW_PATTERNS.some(p => p.test(title));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const teamParam = searchParams.get("team");

  if (!dateStr) return NextResponse.json({ error: "חסר תאריך" }, { status: 400 });

  // Determine team
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true, role: true, email: true } });
  const team = teamParam ? Number(teamParam) : user?.team;
  if (!team) return NextResponse.json({ error: "חסר צוות" }, { status: 400 });

  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";

  // Verify ממ״ש or admin access
  const activeMamash = await prisma.mamashRole.findFirst({
    where: { team, active: true },
    include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true } } },
  });
  if (!isAdmin && activeMamash?.userId !== userId) {
    return NextResponse.json({ error: "אין הרשאה — רק ממ״ש פעיל או מפקד" }, { status: 403 });
  }

  // Israel day boundaries — auto-detects IST/IDT offset
  const { dayStart, dayEnd } = israelDayRange(dateStr);
  const weekStart = getWeekStart(new Date(dateStr));

  // Parallel fetches
  const [events, teamMembers, dutyAssignments, chopalRequests, requirements, changelog] = await Promise.all([
    // Events: platoon (all) + this team
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
    // Team members
    prisma.user.findMany({
      where: { team, role: { not: "sagal" } },
      select: { id: true, name: true, nameEn: true, image: true, team: true },
      orderBy: { name: "asc" },
    }),
    // Duty assignments for today
    prisma.dutyAssignment.findMany({
      where: {
        table: { date: dateStr },
      },
      select: { userId: true, timeSlot: true },
    }),
    // Chopal requests for today
    prisma.chopalRequest.findMany({
      where: { date: dateStr, needed: true },
      select: { userId: true },
    }),
    // Requirements for the week
    prisma.scheduleRequirement.findMany({
      where: { team, weekStart },
      include: {
        targetUser: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Changelog for today
    prisma.scheduleChange.findMany({
      where: { team, date: dateStr },
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build availability matrix
  // Split platoon events into hard blocks vs scheduling windows
  const platoonEvents = events.filter(e => e.target === "all" && !e.allDay);
  const blockingPlatoon = platoonEvents.filter(e => !isSchedulingWindow(e.title));
  const windowPlatoon = platoonEvents.filter(e => isSchedulingWindow(e.title));
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

  // Convert Israel local HH:MM to UTC Date — auto-detects IST/IDT
  function slotToUTC(hh: number, mm: number): Date {
    return israelDate(dateStr!, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  const availability = teamMembers.map(member => {
    const memberSlots = slots.map(slotTime => {
      const [sh, sm] = slotTime.split(":").map(Number);
      const slotStart = slotToUTC(sh, sm);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      // Check leave
      if (chopalUserIds.has(member.id)) {
        return { time: slotTime, status: "leave" as const };
      }

      // Check duty
      const memberDuty = dutyByUser.get(member.id);
      if (memberDuty?.some(ts => ts === slotTime || ts.startsWith(slotTime.split(":")[0]))) {
        return { time: slotTime, status: "duty" as const };
      }

      // Check platoon events — classify as scheduling-window or platoon-soft-block
      const platoonHit = platoonEvents.find(e => {
        const es = new Date(e.startTime);
        const ee = new Date(e.endTime);
        return es < slotEnd && ee > slotStart;
      });
      if (platoonHit) {
        // First check if already assigned to a team event here
        const teamBlock = teamEvents.find(e => {
          const es = new Date(e.startTime);
          const ee = new Date(e.endTime);
          return es < slotEnd && ee > slotStart && e.assignees.some(a => a.userId === member.id);
        });
        if (teamBlock) {
          return { time: slotTime, status: "assigned" as const, eventTitle: teamBlock.title };
        }
        // Known scheduling windows = green, other platoon = soft block (overridable)
        if (isSchedulingWindow(platoonHit.title)) {
          return { time: slotTime, status: "scheduling-window" as const, eventTitle: platoonHit.title };
        }
        return { time: slotTime, status: "platoon-blocked" as const, eventTitle: platoonHit.title, overridable: true };
      }

      // Check team assignments
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

  // Compute free slots (windows where no platoon event exists)
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
    activeMamash: activeMamash ? { id: activeMamash.id, userId: activeMamash.userId, user: activeMamash.user } : null,
  });
}
