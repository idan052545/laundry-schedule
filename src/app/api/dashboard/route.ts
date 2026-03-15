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

  const [
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    latestMaterial,
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

    // Latest professional material
    prisma.professionalMaterial.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true, author: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    latestMessage,
    pinnedPosts,
    todayTasks,
    pendingForms,
    birthdayUsers,
    latestMaterial,
  });
}
