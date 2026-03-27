import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
  const { israelToday } = await import("@/lib/israel-tz");
  const date = searchParams.get("date") || israelToday();
  const sessionName = searchParams.get("session") || "morning";

  // Exclude commanders & simulator users from attendance lists
  const EXCLUDED_ROLES = ["sagal", "simulator", "simulator-admin"];
  const users = await prisma.user.findMany({
    where: { role: { notIn: EXCLUDED_ROLES } },
    select: { id: true, name: true, nameEn: true, team: true, image: true, roomNumber: true },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  const attendances = await prisma.attendance.findMany({
    where: { date, session: sessionName },
  });

  const attendanceMap = new Map(attendances.map((a) => [a.userId, a]));

  const result = users.map((user) => ({
    ...user,
    attendance: attendanceMap.get(user.id) || null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const markedById = (session.user as { id: string }).id;

  if (!(await isAuthorized(markedById))) {
    return NextResponse.json({ error: "רק אוהד אבדי יכול לסמן נוכחות" }, { status: 403 });
  }

  const { userId, date, session: sessionName, present } = await request.json();

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date_session: { userId, date, session: sessionName },
    },
    update: { present, markedBy: markedById },
    create: { userId, date, session: sessionName, present, markedBy: markedById },
  });

  return NextResponse.json(attendance);
}
