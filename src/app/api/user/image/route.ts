import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "לא נבחרה תמונה" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(process.cwd(), "public", "avatars", filename);

  await writeFile(filepath, buffer);

  const imageUrl = `/avatars/${filename}`;

  await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
  });

  return NextResponse.json({ image: imageUrl });
}
