import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const messages = await prisma.message.findMany({
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
    },
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
  const { title, content, pinned } = await request.json();

  if (!title || !content) {
    return NextResponse.json({ error: "נא למלא כותרת ותוכן" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { title, content, authorId: userId, pinned: pinned || false },
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
    },
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
