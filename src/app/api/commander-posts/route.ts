import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get("authorId");

  const where: Record<string, unknown> = {};
  if (authorId) where.authorId = authorId;

  const posts = await prisma.commanderPost.findMany({
    where,
    include: {
      author: {
        select: { id: true, name: true, image: true, roleTitle: true },
      },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Check if user is commander or admin
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "commander" && user.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json();
  const { type, title, content, imageUrl, pinned, dueDate } = body;

  const post = await prisma.commanderPost.create({
    data: {
      authorId: userId,
      type: type || "message",
      title,
      content,
      imageUrl: imageUrl || null,
      pinned: pinned || false,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      author: {
        select: { id: true, name: true, image: true, roleTitle: true },
      },
    },
  });

  // Send push notification (fire and forget)
  const typeLabels: Record<string, string> = {
    message: "הודעה",
    task: "משימה",
    reminder: "תזכורת",
    image: "תמונה",
  };
  sendPushToAll({
    title: `${typeLabels[type] || "הודעה"} מ${user.name}`,
    body: title,
    url: "/commander",
    tag: `commander-${post.id}`,
  }, userId).catch(() => {});

  return NextResponse.json(post);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const post = await prisma.commanderPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only author or admin can delete
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (post.authorId !== userId && user?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.commanderPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
