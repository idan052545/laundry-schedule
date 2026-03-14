import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const materials = await prisma.professionalMaterial.findMany({
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Return without fileData for listing (too large)
  const result = materials.map(({ fileData, ...rest }) => ({
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
    return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 5MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const fileData = `data:${file.type};base64,${base64}`;

  const material = await prisma.professionalMaterial.create({
    data: {
      title,
      description: description || null,
      category: category || "general",
      fileData,
      fileName: file.name,
      fileType: file.type,
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

  await prisma.professionalMaterial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
