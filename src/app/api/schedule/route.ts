import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers, sendPushToAll } from "@/lib/push";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { team: true, role: true, email: true },
  });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const type = searchParams.get("type");

  if (!dateStr) {
    return NextResponse.json({ error: "חסר תאריך" }, { status: 400 });
  }

  const dayStart = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(dateStr + "T23:59:59Z");

  const where: Record<string, unknown> = {
    startTime: { gte: dayStart, lte: dayEnd },
  };

  if (type && type !== "all") {
    where.type = type;
  }

  const events = await prisma.scheduleEvent.findMany({
    where,
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, image: true, team: true } } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Filter events: show if target matches user's team, or target is "all", or user is assigned
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";
  const userTeam = user?.team ? `team-${user.team}` : null;

  const filtered = isAdmin
    ? events
    : events.filter((e) => {
        if (e.target === "all") return true;
        if (userTeam && e.target === userTeam) return true;
        if (e.assignees.some((a) => a.userId === userId)) return true;
        return false;
      });

  return NextResponse.json({ events: filtered, isAdmin });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  if (!isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, startTime, endTime, allDay, target, type } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const event = await prisma.scheduleEvent.create({
    data: {
      title,
      description: description || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      allDay: allDay || false,
      target: target || "all",
      type: type || "general",
    },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, image: true, team: true } } },
      },
    },
  });

  return NextResponse.json(event);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  if (!isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json();
  const { id, action, assigneeIds, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  // Handle assign action
  if (action === "assign") {
    // Clear existing assignees and set new ones
    await prisma.scheduleAssignee.deleteMany({ where: { eventId: id } });
    if (assigneeIds && assigneeIds.length > 0) {
      await prisma.scheduleAssignee.createMany({
        data: assigneeIds.map((uid: string) => ({ eventId: id, userId: uid })),
      });
    }

    const event = await prisma.scheduleEvent.findUnique({
      where: { id },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, image: true, team: true } } },
        },
      },
    });

    return NextResponse.json(event);
  }

  // Handle remind action
  if (action === "remind") {
    const event = await prisma.scheduleEvent.findUnique({
      where: { id },
      include: { assignees: true },
    });

    if (!event) {
      return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
    }

    const startStr = new Date(event.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

    if (event.assignees.length > 0) {
      const userIds = event.assignees.map((a) => a.userId);
      await sendPushToUsers(userIds, {
        title: `תזכורת: ${event.title}`,
        body: `בשעה ${startStr}`,
        url: "/schedule-daily",
        tag: `schedule-remind-${id}`,
      });
    } else {
      // Send to all or specific team
      if (event.target === "all") {
        await sendPushToAll({
          title: `תזכורת: ${event.title}`,
          body: `בשעה ${startStr}`,
          url: "/schedule-daily",
          tag: `schedule-remind-${id}`,
        });
      } else {
        // Send to specific team
        const teamNum = event.target.replace("team-", "");
        const teamUsers = await prisma.user.findMany({
          where: { team: parseInt(teamNum) },
          select: { id: true },
        });
        await sendPushToUsers(teamUsers.map((u) => u.id), {
          title: `תזכורת: ${event.title}`,
          body: `בשעה ${startStr}`,
          url: "/schedule-daily",
          tag: `schedule-remind-${id}`,
        });
      }
    }

    return NextResponse.json({ success: true });
  }

  // Regular update
  const data: Record<string, unknown> = {};
  if (updateData.title !== undefined) data.title = updateData.title;
  if (updateData.description !== undefined) data.description = updateData.description || null;
  if (updateData.startTime) data.startTime = new Date(updateData.startTime);
  if (updateData.endTime) data.endTime = new Date(updateData.endTime);
  if (updateData.allDay !== undefined) data.allDay = updateData.allDay;
  if (updateData.target !== undefined) data.target = updateData.target;
  if (updateData.type !== undefined) data.type = updateData.type;

  const event = await prisma.scheduleEvent.update({
    where: { id },
    data,
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, image: true, team: true } } },
      },
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  if (!isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  await prisma.scheduleEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
