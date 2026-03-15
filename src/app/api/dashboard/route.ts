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

    // Today's tasks
    prisma.task.findMany({
      where: {
        startDate: {
          gte: new Date(todayStr + "T00:00:00"),
          lt: new Date(todayStr + "T23:59:59"),
        },
      },
      take: 5,
      select: { id: true, title: true, startDate: true, category: true },
    }),

    // Forms user hasn't submitted
    prisma.formLink.findMany({
      where: {
        submissions: { none: { userId } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, deadline: true },
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
  ]);

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

  return NextResponse.json({
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    unreadMaterials: latestMaterial,
    currentSchedule,
    allDaySchedule: allDayEvents,
  });
}
