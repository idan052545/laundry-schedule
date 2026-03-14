import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { put, del } from "@vercel/blob";

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const formats = await prisma.taskFormat.findMany({
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  const result = formats.map(({ fileData, ...rest }) => ({
    ...rest,
    hasFile: !!fileData,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const file = formData.get("file") as File | null;

  if (!title || !file) {
    return NextResponse.json({ error: "נא למלא כותרת ולצרף קובץ" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 30MB)" }, { status: 400 });
  }

  // Upload to Vercel Blob
  const blob = await put(`formats/${Date.now()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  const format = await prisma.taskFormat.create({
    data: {
      title,
      description: description || null,
      category: category || "general",
      fileData: blob.url,
      fileName: file.name,
      fileType: file.type,
      authorId: userId,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  const { fileData: _, ...result } = format;

  sendPushToAll({
    title: "פורמט חדש הועלה",
    body: title,
    url: "/formats",
    tag: `format-${format.id}`,
  }, userId).catch(() => {});

  return NextResponse.json({ ...result, hasFile: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const format = await prisma.taskFormat.findUnique({ where: { id } });
  if (!format || (format.authorId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  // Delete blob if it's a URL
  if (format.fileData.startsWith("http")) {
    try { await del(format.fileData); } catch {}
  }

  await prisma.taskFormat.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
