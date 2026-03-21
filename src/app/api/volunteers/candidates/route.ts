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

  // Check if current user is admin/commander — they see all candidates
  const userId = (session.user as { id: string }).id;
  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isPrivileged = currentUser?.role === "admin" || currentUser?.role === "commander";

  // Get target users (admin/commander see everyone)
  let teamFilter: Record<string, unknown> = {};
  if (!isPrivileged) {
    if (target.startsWith("team-")) {
      teamFilter = { team: parseInt(target.replace("team-", "")) };
    } else if (target === "mixed") {
      const targetDetails = searchParams.get("targetDetails");
      if (targetDetails) {
        const teams = JSON.parse(targetDetails).map((d: { team: number }) => d.team);
        teamFilter = { team: { in: teams } };
      }
    }
  }

  // Fetch users + their conflicts in parallel
  const [users, scheduleConflicts, volunteerConflicts, dutyConflicts, existingAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { ...teamFilter, role: { not: "simulator" } },
      select: { id: true, name: true, nameEn: true, image: true, team: true, role: true },
      orderBy: [{ team: "asc" }, { name: "asc" }],
    }),
    // Schedule conflicts
    prisma.scheduleEvent.findMany({
      where: {
        startTime: { lt: end },
        endTime: { gt: start },
        allDay: false,
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

  // Build conflict map per user
  const candidates = users.map(user => {
    const conflicts: { type: string; title: string; priority: number }[] = [];

    // Schedule conflicts
    for (const ev of scheduleConflicts) {
      const isAssigned = ev.assignees.some(a => a.userId === user.id);
      const isTargetAll = ev.target === "all";
      const isTargetTeam = ev.target === `team-${user.team}`;
      if (isAssigned || isTargetAll || isTargetTeam) {
        const priority = isTargetAll ? 3 : isTargetTeam ? 2 : 1;
        conflicts.push({
          type: isTargetAll ? "platoon" : isTargetTeam ? "team" : "personal",
          title: ev.title,
          priority,
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

    return {
      ...user,
      conflicts,
      isFree: conflicts.length === 0,
      isAssigned: assignedUserIds.has(user.id),
    };
  });

  // Sort: assigned first, then free, then by conflict count
  candidates.sort((a, b) => {
    if (a.isAssigned !== b.isAssigned) return a.isAssigned ? -1 : 1;
    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
    return a.conflicts.length - b.conflicts.length;
  });

  return NextResponse.json(candidates);
}
