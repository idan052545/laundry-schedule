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
    nextDutyTable,
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
      take: 2,
      select: { id: true, title: true, startTime: true, endTime: true, type: true },
    }),

    // Today's all-day events
    prisma.scheduleEvent.findMany({
      where: {
        startTime: { gte: new Date(todayStr + "T00:00:00Z"), lte: new Date(todayStr + "T23:59:59Z") },
        allDay: true,
        OR: targetFilter,
      },
      orderBy: { startTime: "asc" },
      select: { id: true, title: true, type: true },
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

    // Next upcoming duty table (today or future) with user's assignments
    prisma.dutyTable.findFirst({
      where: { date: { gte: todayStr } },
      orderBy: { date: "asc" },
      include: {
        assignments: {
          where: { userId },
          include: { user: { select: { id: true, name: true } } },
        },
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

  // Pick current (happening now) or next upcoming timed event
  let currentSchedule: { id: string; title: string; startTime: Date; endTime: Date; type: string; status: "now" | "next" } | null = null;
  for (const ev of timedEvents) {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    if (now >= start && now <= end) {
      currentSchedule = { ...ev, startTime: start, endTime: end, status: "now" };
      break;
    } else if (start > now) {
      currentSchedule = { ...ev, startTime: start, endTime: end, status: "next" };
      break;
    }
  }

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
    allDaySchedule: allDayEvents,
    pendingSurveys,
    pendingPlatoonSurveys,
    platoonSurveyCommanderId,
    hasVotedThisWeek,
    dailyQuote,
    todayNotes,
    nextDutyTable: nextDutyTable ? {
      id: nextDutyTable.id,
      title: nextDutyTable.title,
      date: nextDutyTable.date,
      type: nextDutyTable.type,
      myAssignments: nextDutyTable.assignments.map((a: { role: string; timeSlot: string }) => ({
        role: a.role,
        timeSlot: a.timeSlot,
      })),
    } : null,
  });
}
