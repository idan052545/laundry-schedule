import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const RONI_NAME = "רוני קרפט";

async function isRoni(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.name === RONI_NAME || user?.email === "ohad@dotan.com" || user?.role === "admin";
}

/** GET — get day type for a date */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "חסר תאריך" }, { status: 400 });

  const config = await prisma.dayTypeConfig.findUnique({ where: { date } });
  return NextResponse.json({ dayType: config?.type || "duty" });
}

/** PUT — set day type for a date (Roni only) */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { date, type } = await req.json();
  if (!date || !type || !["duty", "kitchen"].includes(type)) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  await prisma.dayTypeConfig.upsert({
    where: { date },
    create: { date, type },
    update: { type },
  });

  return NextResponse.json({ success: true, dayType: type });
}
