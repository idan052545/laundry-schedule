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
      author: { select: { id: true, name: true, nameEn: true, image: true } },
      reads: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = materials.map(({ fileData, reads, ...rest }) => ({
    ...rest,
    hasFile: !!fileData,
    isRead: reads.length > 0,
    tags: rest.tags ? JSON.parse(rest.tags) : [],
  }));

  // Collect all unique tags across materials
  const allTags = [...new Set(result.flatMap((m) => m.tags as string[]))].sort();

  return NextResponse.json({ materials: result, allTags });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { title, description, category, blobUrl, fileName, fileType, tags } = await request.json();

  if (!title || !blobUrl) {
    return NextResponse.json({ error: "נא למלא כותרת ולצרף קובץ" }, { status: 400 });
  }

  const material = await prisma.professionalMaterial.create({
    data: {
      title,
      description: description || null,
      category: category || "general",
      tags: tags?.length ? JSON.stringify(tags) : null,
      fileData: blobUrl,
      fileName: fileName || "file",
      fileType: fileType || "application/octet-stream",
      authorId: userId,
    },
    include: { author: { select: { id: true, name: true, nameEn: true, image: true } } },
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

  // Edit title/description/tags
  const { id, title, description, tags } = body;
  if (!id || !title) {
    return NextResponse.json({ error: "נא למלא כותרת" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const material = await prisma.professionalMaterial.findUnique({ where: { id } });
  if (!material || (material.authorId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const data: Record<string, unknown> = { title, description: description || null };
  if (tags !== undefined) data.tags = tags?.length ? JSON.stringify(tags) : null;

  const updated = await prisma.professionalMaterial.update({
    where: { id },
    data,
    include: { author: { select: { id: true, name: true, nameEn: true, image: true } } },
  });

  const { fileData: _, ...result } = updated;
  return NextResponse.json({ ...result, hasFile: !!updated.fileData, tags: updated.tags ? JSON.parse(updated.tags) : [] });
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
