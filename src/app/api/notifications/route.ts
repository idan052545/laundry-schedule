import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — fetch recent notifications for current user (last 1 hour)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      body: true,
      url: true,
      tag: true,
      read: true,
      createdAt: true,
    },
  });

  return NextResponse.json(notifications);
}

// PUT — mark notifications as read
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { ids } = await req.json();

  if (ids && Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { read: true },
    });
  } else {
    // Mark all as read
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.notification.updateMany({
      where: { userId, createdAt: { gte: oneHourAgo } },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
