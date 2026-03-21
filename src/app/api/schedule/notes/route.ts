import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { team: true },
  });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "חסר תאריך" }, { status: 400 });
  }

  // Show: user's own notes + team notes from same team
  const where: Record<string, unknown> = { date };
  if (user?.team) {
    where.OR = [
      { userId, visibility: "personal" },
      { visibility: "team", user: { team: user.team } },
    ];
  } else {
    where.userId = userId;
  }

  const notes = await prisma.scheduleNote.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { title, description, date, startTime, endTime, visibility } = body;

  if (!title || !date) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const note = await prisma.scheduleNote.create({
    data: {
      title,
      description: description || null,
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      visibility: visibility || "personal",
      userId,
    },
    include: {
      user: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
    },
  });

  // If team visibility, notify team members
  if (visibility === "team") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { team: true, name: true },
    });
    if (user?.team) {
      const members = await prisma.user.findMany({
        where: { team: user.team, id: { not: userId } },
        select: { id: true },
      });
      if (members.length > 0) {
        await sendPushToUsers(members.map((m) => m.id), {
          title: `הערה חדשה מ${user.name}`,
          body: title,
          url: "/schedule-daily",
          tag: `note-${note.id}`,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json(note);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { id, action, title, description, startTime, endTime, visibility } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const note = await prisma.scheduleNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "הערה לא נמצאה" }, { status: 404 });
  }

  // Only owner can edit
  if (note.userId !== userId) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  // Remind self
  if (action === "remind") {
    await sendPushToUsers([userId], {
      title: `תזכורת: ${note.title}`,
      body: note.startTime ? `בשעה ${note.startTime}` : note.title,
      url: "/schedule-daily",
      tag: `note-remind-${id}`,
    }).catch(() => {});
    return NextResponse.json({ success: true });
  }

  // Edit
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (startTime !== undefined) data.startTime = startTime || null;
  if (endTime !== undefined) data.endTime = endTime || null;
  if (visibility !== undefined) data.visibility = visibility;

  const updated = await prisma.scheduleNote.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
    },
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

  const note = await prisma.scheduleNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "הערה לא נמצאה" }, { status: 404 });
  }

  if (note.userId !== userId) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.scheduleNote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
