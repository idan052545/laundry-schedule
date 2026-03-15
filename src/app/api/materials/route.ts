import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { del } from "@vercel/blob";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const materials = await prisma.professionalMaterial.findMany({
    include: {
      author: { select: { id: true, name: true, image: true } },
      reads: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = materials.map(({ fileData, reads, ...rest }) => ({
    ...rest,
    hasFile: !!fileData,
    isRead: reads.length > 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { title, description, category, blobUrl, fileName, fileType } = await request.json();

  if (!title || !blobUrl) {
    return NextResponse.json({ error: "נא למלא כותרת ולצרף קובץ" }, { status: 400 });
  }

  const material = await prisma.professionalMaterial.create({
    data: {
      title,
      description: description || null,
      category: category || "general",
      fileData: blobUrl,
      fileName: fileName || "file",
      fileType: fileType || "application/octet-stream",
      authorId: userId,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  const { fileData: _, ...result } = material;

  sendPushToAll({
    title: "חומר מקצועי חדש",
    body: title,
    url: "/materials",
    tag: `material-${material.id}`,
  }, userId).catch(() => {});

  return NextResponse.json({ ...result, hasFile: true });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();

  // Mark as read / unread
  if (body.action === "toggleRead") {
    const { materialId } = body;
    if (!materialId) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    const existing = await prisma.materialRead.findUnique({
      where: { materialId_userId: { materialId, userId } },
    });

    if (existing) {
      await prisma.materialRead.delete({ where: { id: existing.id } });
      return NextResponse.json({ isRead: false });
    }

    await prisma.materialRead.create({ data: { materialId, userId } });
    return NextResponse.json({ isRead: true });
  }

  // Edit title/description
  const { id, title, description } = body;
  if (!id || !title) {
    return NextResponse.json({ error: "נא למלא כותרת" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const material = await prisma.professionalMaterial.findUnique({ where: { id } });
  if (!material || (material.authorId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const updated = await prisma.professionalMaterial.update({
    where: { id },
    data: { title, description: description || null },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  const { fileData: _, ...result } = updated;
  return NextResponse.json({ ...result, hasFile: !!updated.fileData });
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
  const material = await prisma.professionalMaterial.findUnique({ where: { id } });
  if (!material || (material.authorId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  if (material.fileData.startsWith("http")) {
    try { await del(material.fileData); } catch {}
  }

  await prisma.professionalMaterial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
