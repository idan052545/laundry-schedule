import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — get free candidates for a volunteer request
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const target = searchParams.get("target") || "all";

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "חסר זמנים" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  const userId = (session.user as { id: string }).id;

  // Always apply team filter based on request target
  let teamFilter: Record<string, unknown> = {};
  if (target.startsWith("team-")) {
    teamFilter = { team: parseInt(target.replace("team-", "")) };
  } else if (target === "mixed") {
    const targetDetails = searchParams.get("targetDetails");
    if (targetDetails) {
      const teams = JSON.parse(targetDetails).map((d: { team: number }) => d.team);
      teamFilter = { team: { in: teams } };
    }
  }

  // Parse per-team quotas for mixed requests
  let teamQuotas: Record<number, number> | null = null;
  if (target === "mixed") {
    const targetDetails = searchParams.get("targetDetails");
    if (targetDetails) {
      try {
        const details = JSON.parse(targetDetails) as { team: number; count: number }[];
        teamQuotas = {};
        for (const d of details) teamQuotas[d.team] = d.count;
      } catch { /* ignore */ }
    }
  }

  // Fetch users + their conflicts in parallel (exclude simulator, admin, sagal)
  const [users, scheduleConflicts, volunteerConflicts, dutyConflicts, existingAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { ...teamFilter, role: { notIn: ["simulator", "admin", "sagal"] } },
      select: { id: true, name: true, nameEn: true, image: true, team: true, role: true },
      orderBy: [{ team: "asc" }, { name: "asc" }],
    }),
    // Schedule conflicts — only fetch events where users are personally assigned
    prisma.scheduleEvent.findMany({
      where: {
        startTime: { lt: end },
        endTime: { gt: start },
        allDay: false,
        assignees: { some: {} }, // only events that have personal assignees
      },
      select: {
        id: true, title: true, startTime: true, endTime: true, target: true, type: true,
        assignees: { select: { userId: true } },
      },
    }),
    // Existing volunteer assignments that overlap
    prisma.volunteerAssignment.findMany({
      where: {
        status: { in: ["assigned", "active"] },
        request: { startTime: { lt: end }, endTime: { gt: start } },
        ...(requestId ? { requestId: { not: requestId } } : {}),
      },
      select: {
        userId: true,
        request: { select: { title: true, startTime: true, endTime: true } },
      },
    }),
    // Guard duty conflicts
    prisma.dutyAssignment.findMany({
      where: {
        table: {
          date: {
            gte: start.toISOString().split("T")[0],
            lte: end.toISOString().split("T")[0],
          },
        },
      },
      select: {
        userId: true, role: true, timeSlot: true,
        table: { select: { title: true, date: true } },
      },
    }),
    // Already assigned to this request
    requestId ? prisma.volunteerAssignment.findMany({
      where: { requestId, status: { not: "cancelled" } },
      select: { userId: true },
    }) : Promise.resolve([]),
  ]);

  const assignedUserIds = new Set(existingAssignments.map(a => a.userId));

  // Count per-team assignments for quota checking
  let teamAssignedCounts: Record<number, number> = {};
  if (teamQuotas) {
    for (const a of existingAssignments) {
      const user = users.find(u => u.id === a.userId);
      if (user?.team != null) {
        teamAssignedCounts[user.team] = (teamAssignedCounts[user.team] || 0) + 1;
      }
    }
  }

  // Build conflict map per user
  const candidates = users.map(user => {
    const conflicts: { type: string; title: string; priority: number }[] = [];

    // Schedule conflicts — only if user is personally assigned to the event
    for (const ev of scheduleConflicts) {
      const isPersonallyAssigned = ev.assignees.some(a => a.userId === user.id);
      if (isPersonallyAssigned) {
        conflicts.push({
          type: "personal",
          title: ev.title,
          priority: 3,
        });
      }
    }

    // Volunteer conflicts
    for (const va of volunteerConflicts) {
      if (va.userId === user.id) {
        conflicts.push({ type: "volunteer", title: va.request.title, priority: 2 });
      }
    }

    // Duty conflicts
    for (const da of dutyConflicts) {
      if (da.userId === user.id) {
        conflicts.push({ type: "duty", title: `${da.table.title} — ${da.role}`, priority: 3 });
      }
    }

    // Sort conflicts by priority desc
    conflicts.sort((a, b) => b.priority - a.priority);

    // Check if user's team quota is full
    let teamFull = false;
    if (teamQuotas && user.team != null && !assignedUserIds.has(user.id)) {
      const quota = teamQuotas[user.team];
      const assigned = teamAssignedCounts[user.team] || 0;
      if (quota != null && assigned >= quota) teamFull = true;
    }

    return {
      ...user,
      conflicts,
      isFree: conflicts.length === 0,
      isAssigned: assignedUserIds.has(user.id),
      teamFull,
    };
  });

  // Sort: assigned first, then free, then by conflict count; team-full users at bottom
  candidates.sort((a, b) => {
    if (a.isAssigned !== b.isAssigned) return a.isAssigned ? -1 : 1;
    if (a.teamFull !== b.teamFull) return a.teamFull ? 1 : -1;
    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
    return a.conflicts.length - b.conflicts.length;
  });

  return NextResponse.json(candidates);
}
