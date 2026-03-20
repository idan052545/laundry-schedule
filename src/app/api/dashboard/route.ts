import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
  const todayMonthDay = `${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { team: true },
  });
  const userTeam = user?.team ? `team-${user.team}` : null;
  const now = new Date();

  const targetFilter = [
    { target: "all" as const },
    ...(userTeam ? [{ target: userTeam }] : []),
    { assignees: { some: { userId } } },
  ];

  const [
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    latestMaterial,
    timedEvents,
    allDayEvents,
    pendingSurveys,
    pendingPlatoonSurveys,
    dailyQuote,
    upcomingDutyTables,
    myTeamAssignments,
    activeVolunteerRequests,
    myVolunteerAssignments,
    myCreatedRequests,
    urgentReplacement,
    todayNotes,
  ] = await Promise.all([
    // Latest message
    prisma.message.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true, author: { select: { name: true } } },
    }),

    // Pinned commander posts
    prisma.commanderPost.findMany({
      where: { pinned: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, type: true, dueDate: true, author: { select: { name: true } } },
    }),

    // Today's tasks (user's own + global)
    prisma.task.findMany({
      where: {
        status: "open",
        OR: [
          // Tasks starting today
          {
            startDate: { gte: new Date(todayStr + "T00:00:00"), lte: new Date(todayStr + "T23:59:59") },
            OR: [{ userId }, { userId: null }],
          },
          // Overdue tasks (due date passed but still open)
          {
            dueDate: { lt: new Date(todayStr + "T00:00:00") },
            OR: [{ userId }, { userId: null }],
          },
          // Due soon (within 3 days)
          {
            dueDate: { gte: new Date(todayStr + "T00:00:00"), lte: new Date(new Date().getTime() + 3 * 86400000) },
            OR: [{ userId }, { userId: null }],
          },
        ],
      },
      orderBy: [{ priority: "asc" }, { startDate: "asc" }],
      take: 10,
      select: { id: true, title: true, startDate: true, category: true, priority: true, dueDate: true, status: true },
    }),

    // Forms user hasn't submitted (non-recurring: never submitted, recurring: not submitted today)
    prisma.formLink.findMany({
      where: {
        OR: [
          { recurring: false, submissions: { none: { userId } } },
          { recurring: true, submissions: { none: { userId, date: todayStr } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, deadline: true, recurring: true },
    }),

    // Birthdays today
    prisma.user.findMany({
      where: {
        birthDate: { endsWith: todayMonthDay },
      },
      select: { id: true, name: true, image: true },
    }),

    // Unread professional materials
    prisma.professionalMaterial.findMany({
      where: {
        reads: { none: { userId } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true, author: { select: { name: true } } },
    }),

    // Today's timed schedule events (not all-day) that haven't ended yet
    prisma.scheduleEvent.findMany({
      where: {
        endTime: { gte: now },
        startTime: { lte: new Date(todayStr + "T23:59:59Z") },
        allDay: false,
        OR: targetFilter,
      },
      orderBy: { startTime: "asc" },
      take: 10,
      select: {
        id: true, title: true, startTime: true, endTime: true, type: true, target: true,
        assignees: { where: { userId }, select: { id: true } },
      },
    }),

    // Today's all-day events
    prisma.scheduleEvent.findMany({
      where: {
        startTime: { lte: new Date(todayStr + "T23:59:59Z") },
        endTime: { gt: new Date(todayStr + "T00:00:00Z") },
        allDay: true,
        OR: targetFilter,
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true, title: true, type: true, target: true,
        assignees: { where: { userId }, select: { id: true } },
      },
    }),

    // Pending team surveys (active, user's team, not yet responded)
    user?.team
      ? prisma.survey.findMany({
          where: { team: user.team, status: "active", responses: { none: { userId } } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, title: true, createdAt: true },
        })
      : Promise.resolve([]),

    // Pending platoon surveys (active, team=0, not yet responded)
    prisma.survey.findMany({
      where: { team: 0, status: "active", responses: { none: { userId } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),

    // Today's daily quote
    prisma.dailyQuote.findUnique({
      where: { date: todayStr },
      include: { user: { select: { name: true, team: true } } },
    }),

    // Next upcoming duty tables (today or future) with ALL assignments (to show partners)
    prisma.dutyTable.findMany({
      where: { date: { gte: todayStr } },
      orderBy: { date: "asc" },
      take: 10,
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),

    // Today's team schedule events where user is personally assigned
    prisma.scheduleEvent.findMany({
      where: {
        startTime: { lte: new Date(todayStr + "T23:59:59Z") },
        endTime: { gt: new Date(todayStr + "T00:00:00Z") },
        target: { not: "all" },
        assignees: { some: { userId } },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true, title: true, startTime: true, endTime: true, type: true, target: true, allDay: true,
      },
    }),

    // Active volunteer requests (open or in-progress, relevant to user, not ended)
    prisma.volunteerRequest.findMany({
      where: {
        status: { in: ["open", "in-progress"] },
        endTime: { gt: new Date() },
        OR: [
          { target: "all" },
          ...(userTeam ? [{ target: userTeam }] : []),
          { target: "mixed" },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true, title: true, category: true, priority: true, status: true,
        target: true, requiredCount: true, startTime: true, endTime: true,
        isCommanderRequest: true,
        createdBy: { select: { name: true, phone: true } },
        _count: { select: { assignments: true } },
      },
    }),

    // User's active volunteer assignments
    prisma.volunteerAssignment.findMany({
      where: {
        userId,
        status: { in: ["assigned", "active"] },
        request: { status: { in: ["open", "in-progress"] } },
      },
      take: 5,
      select: {
        id: true, status: true,
        request: { select: { id: true, title: true, startTime: true, endTime: true, category: true } },
      },
    }),

    // User's created volunteer requests (open/in-progress/filled, not ended)
    prisma.volunteerRequest.findMany({
      where: {
        createdById: userId,
        status: { in: ["open", "in-progress", "filled"] },
        endTime: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, category: true, status: true, startTime: true, endTime: true,
        requiredCount: true, _count: { select: { assignments: true } },
      },
    }),

    // Urgent replacements needing attention
    prisma.volunteerReplacement.findFirst({
      where: {
        isUrgent: true, status: "seeking",
        request: {
          status: { in: ["open", "in-progress"] },
          OR: [
            { target: "all" },
            ...(userTeam ? [{ target: userTeam }] : []),
            { target: "mixed" },
          ],
        },
      },
      select: {
        id: true, isUrgent: true,
        request: { select: { id: true, title: true } },
      },
    }),

    // Today's schedule notes (personal + team)
    prisma.scheduleNote.findMany({
      where: {
        date: todayStr,
        OR: [
          { userId, visibility: "personal" },
          ...(user?.team ? [{ visibility: "team" as const, user: { team: user.team } }] : []),
        ],
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Check chopal registration for tomorrow
  const tomorrowDate = (() => {
    const t = new Date();
    const il = new Date(t.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    il.setDate(il.getDate() + 1);
    return `${il.getFullYear()}-${(il.getMonth() + 1).toString().padStart(2, "0")}-${il.getDate().toString().padStart(2, "0")}`;
  })();
  const israelHour = parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }));
  const chopalRequest = await prisma.chopalRequest.findUnique({
    where: { userId_date: { userId, date: tomorrowDate } },
    include: { assignment: { select: { id: true, assignedTime: true, status: true } } },
  });
  const chopalStatus = {
    registered: !!chopalRequest,
    isOpen: israelHour < 21,
    date: tomorrowDate,
    assignment: chopalRequest?.assignment || null,
  };

  // Check if user voted this week
  const nowDate = new Date();
  const d = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const currentWeek = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

  const weeklyVote = await prisma.weeklyVote.findUnique({
    where: { week_voterId: { week: currentWeek, voterId: userId } },
  });
  const hasVotedThisWeek = !!weeklyVote;

  // Collect all "now" events + first upcoming "next" event
  const scheduleItems: { id: string; title: string; startTime: Date; endTime: Date; type: string; target: string; assignees: { id: string }[]; status: "now" | "next" }[] = [];
  let foundNext = false;
  for (const ev of timedEvents) {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    if (now >= start && now <= end) {
      scheduleItems.push({ ...ev, startTime: start, endTime: end, status: "now" });
    } else if (start > now && !foundNext) {
      scheduleItems.push({ ...ev, startTime: start, endTime: end, status: "next" });
      foundNext = true;
    }
  }
  // Keep backward compat: currentSchedule = first item
  const currentSchedule = scheduleItems.length > 0 ? scheduleItems[0] : null;

  // Find simulations commander for platoon survey link
  let platoonSurveyCommanderId: string | null = null;
  if (pendingPlatoonSurveys.length > 0) {
    const simCommander = await prisma.user.findFirst({
      where: { roleTitle: { contains: "סימולציות" } },
      select: { id: true },
    });
    platoonSurveyCommanderId = simCommander?.id || null;
  }

  return NextResponse.json({
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    unreadMaterials: latestMaterial,
    currentSchedule,
    scheduleItems,
    allDaySchedule: allDayEvents,
    myTeamAssignments,
    pendingSurveys,
    pendingPlatoonSurveys,
    platoonSurveyCommanderId,
    hasVotedThisWeek,
    dailyQuote,
    todayNotes,
    chopalStatus,
    activeVolunteerRequests,
    myVolunteerAssignments,
    myCreatedRequests,
    urgentReplacement,
    nextDutyTables: (() => {
      if (!upcomingDutyTables || upcomingDutyTables.length === 0) return [];
      const firstDate = upcomingDutyTables[0].date;
      return upcomingDutyTables
        .filter((t: { date: string }) => t.date === firstDate)
        .map((t: { id: string; title: string; date: string; type: string; assignments: { userId: string; role: string; timeSlot: string; user: { id: string; name: string } }[] }) => {
          const myAssignments = t.assignments.filter(a => a.userId === userId);
          return {
            id: t.id,
            title: t.title,
            date: t.date,
            type: t.type,
            myAssignments: myAssignments.map(a => {
              // Find partners: same role + timeSlot but different user
              const partners = t.assignments
                .filter(o => o.role === a.role && o.timeSlot === a.timeSlot && o.userId !== userId)
                .map(o => o.user.name);
              return { role: a.role, timeSlot: a.timeSlot, partners };
            }),
          };
        });
    })(),
  });
}
