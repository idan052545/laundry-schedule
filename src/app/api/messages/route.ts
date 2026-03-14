import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const messageInclude = {
  author: { select: { id: true, name: true, image: true, role: true } },
  assignees: {
    include: { user: { select: { id: true, name: true, image: true } } },
  },
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assignedTo = searchParams.get("assignedTo");

  const where: Record<string, unknown> = {};
  if (assignedTo) {
    where.assignees = { some: { userId: assignedTo } };
  }

  const messages = await prisma.message.findMany({
    where,
    include: messageInclude,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const contentType = request.headers.get("content-type") || "";

  let title: string;
  let content: string;
  let pinned = false;
  let imageData: string | null = null;
  let assigneeIds: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    title = formData.get("title") as string;
    content = formData.get("content") as string;
    pinned = formData.get("pinned") === "true";
    assigneeIds = JSON.parse((formData.get("assigneeIds") as string) || "[]");

    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "התמונה גדולה מדי (מקסימום 2MB)" }, { status: 400 });
      }
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const mimeType = imageFile.type || "image/jpeg";
      imageData = `data:${mimeType};base64,${base64}`;
    }
  } else {
    const body = await request.json();
    title = body.title;
    content = body.content;
    pinned = body.pinned || false;
    assigneeIds = body.assigneeIds || [];
  }

  if (!title || !content) {
    return NextResponse.json({ error: "נא למלא כותרת ותוכן" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      title,
      content,
      imageData,
      authorId: userId,
      pinned,
      assignees: assigneeIds.length > 0 ? {
        create: assigneeIds.map((uid: string) => ({ userId: uid })),
      } : undefined,
    },
    include: messageInclude,
  });

  return NextResponse.json(message);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("id");
  const userId = (session.user as { id: string }).id;

  if (!messageId) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message || (message.authorId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.message.delete({ where: { id: messageId } });
  return NextResponse.json({ success: true });
}
