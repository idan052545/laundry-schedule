import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

const taskInclude = {
  user: { select: { id: true, name: true, nameEn: true, image: true } },
  responses: {
    include: { user: { select: { id: true, name: true, nameEn: true, image: true } } },
    orderBy: { createdAt: "desc" as const },
  },
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const scope = searchParams.get("scope"); // "mine" (default), "all" (admin only)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (from && to) {
    where.startDate = { gte: new Date(from), lte: new Date(to) };
  } else if (from) {
    where.startDate = { gte: new Date(from) };
  }

  if (category && category !== "all") {
    where.category = category;
  }

  // Default: show only user's own tasks + global tasks (userId=null)
  if (scope === "all" && isAdmin) {
    // Admin sees everything
  } else {
    where.OR = [{ userId }, { userId: null }];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({ tasks, isAdmin });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { title, description, category, startDate, endDate, dueDate, allDay, priority } = body;

  if (!title || !startDate) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      category: category || "task",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      allDay: allDay || false,
      priority: priority || "normal",
      userId,
    },
    include: taskInclude,
  });

  return NextResponse.json(task);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { id, action, content, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  // Add response (תגובה)
  if (action === "respond") {
    if (!content) {
      return NextResponse.json({ error: "חסר תוכן" }, { status: 400 });
    }
    await prisma.taskResponse.create({
      data: { taskId: id, userId, content },
    });
    const updated = await prisma.task.findUnique({ where: { id }, include: taskInclude });
    return NextResponse.json(updated);
  }

  // Mark done / reopen
  if (action === "done") {
    const updated = await prisma.task.update({
      where: { id },
      data: { status: "done" },
      include: taskInclude,
    });
    return NextResponse.json(updated);
  }

  if (action === "reopen") {
    const updated = await prisma.task.update({
      where: { id },
      data: { status: "open" },
      include: taskInclude,
    });
    return NextResponse.json(updated);
  }

  // Remind self
  if (action === "remind") {
    await sendPushToUsers([userId], {
      title: `תזכורת: ${task.title}`,
      body: task.dueDate
        ? `יעד: ${new Date(task.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}`
        : task.title,
      url: "/tasks",
      tag: `task-remind-${id}`,
    }).catch(() => {});
    return NextResponse.json({ success: true });
  }

  // Only owner or admin can edit
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";
  if (task.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  // Regular update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (updateData.title !== undefined) data.title = updateData.title;
  if (updateData.description !== undefined) data.description = updateData.description || null;
  if (updateData.category !== undefined) data.category = updateData.category;
  if (updateData.startDate) data.startDate = new Date(updateData.startDate);
  if (updateData.endDate !== undefined) data.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
  if (updateData.dueDate !== undefined) data.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
  if (updateData.allDay !== undefined) data.allDay = updateData.allDay;
  if (updateData.priority !== undefined) data.priority = updateData.priority;

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";
  if (task.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
