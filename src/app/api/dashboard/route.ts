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

  const [
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    latestMaterial,
    currentSchedule,
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

    // Current or next schedule event (happening now or starting soonest after now)
    prisma.scheduleEvent.findFirst({
      where: {
        endTime: { gte: now },
        startTime: { lte: new Date(todayStr + "T23:59:59Z") },
        OR: [
          { target: "all" },
          ...(userTeam ? [{ target: userTeam }] : []),
          { assignees: { some: { userId } } },
        ],
      },
      orderBy: { startTime: "asc" },
      select: { id: true, title: true, startTime: true, endTime: true, type: true },
    }),
  ]);

  // Determine if currentSchedule is happening now or upcoming
  let scheduleStatus: "now" | "next" | null = null;
  if (currentSchedule) {
    const start = new Date(currentSchedule.startTime);
    const end = new Date(currentSchedule.endTime);
    if (now >= start && now <= end) scheduleStatus = "now";
    else scheduleStatus = "next";
  }

  return NextResponse.json({
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    unreadMaterials: latestMaterial,
    currentSchedule: currentSchedule ? { ...currentSchedule, status: scheduleStatus } : null,
  });
}
