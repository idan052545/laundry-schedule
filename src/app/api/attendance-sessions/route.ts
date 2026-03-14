import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

// Only אוהד אבדי (סמ"פ) can manage attendance sessions
async function isAuthorized(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return user.name === "אוהד אבדי" || user.role === "admin";
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const sessions = await prisma.attendanceSession.findMany({
    where: { date },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  if (!(await isAuthorized(userId))) {
    return NextResponse.json({ error: "רק אוהד אבדי יכול לפתוח מצל" }, { status: 403 });
  }

  const { name, date } = await request.json();
  if (!name || !date) {
    return NextResponse.json({ error: "נא למלא שם ותאריך" }, { status: 400 });
  }

  const attendanceSession = await prisma.attendanceSession.create({
    data: { name, date, createdBy: userId },
  });

  sendPushToAll({
    title: "מצל חדש נפתח",
    body: name,
    url: "/attendance",
    tag: `attendance-${attendanceSession.id}`,
  }, userId).catch(() => {});

  return NextResponse.json(attendanceSession);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  if (!(await isAuthorized(userId))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  await prisma.attendanceSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
