import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

function getTodayDate(): string {
  const now = new Date();
  // Reset at 10:00 — if before 10am, show yesterday's date
  const resetHour = 10;
  if (now.getHours() < resetHour) {
    now.setDate(now.getDate() - 1);
  }
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const date = getTodayDate();

  const entries = await prisma.aktualiaEntry.findMany({
    where: { date },
    include: { user: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true } } },
    orderBy: { roomNumber: "asc" },
  });

  // Get all rooms that have users
  const rooms = await prisma.user.findMany({
    where: { roomNumber: { not: null } },
    select: { roomNumber: true },
    distinct: ["roomNumber"],
    orderBy: { roomNumber: "asc" },
  });

  const allRooms = rooms.map((r) => r.roomNumber!).filter(Boolean);

  return NextResponse.json({ entries, allRooms, date });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { subject } = await request.json();
  const date = getTodayDate();

  if (!subject || !subject.trim()) {
    return NextResponse.json({ error: "נא להזין נושא" }, { status: 400 });
  }

  // Get user's room
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roomNumber: true, name: true },
  });

  if (!user?.roomNumber) {
    return NextResponse.json({ error: "לא מוגדר חדר בפרופיל שלך" }, { status: 400 });
  }

  // Check for duplicate subject (case-insensitive)
  const normalizedSubject = subject.trim();
  const existing = await prisma.aktualiaEntry.findMany({ where: { date } });
  const duplicate = existing.find(
    (e) => e.subject.trim().toLowerCase() === normalizedSubject.toLowerCase() && e.roomNumber !== user.roomNumber
  );
  if (duplicate) {
    return NextResponse.json({ error: `הנושא "${normalizedSubject}" כבר נבחר על ידי חדר ${duplicate.roomNumber}` }, { status: 409 });
  }

  // Check if this user already submitted today
  const userEntry = existing.find((e) => e.userId === userId);
  if (userEntry) {
    return NextResponse.json({ error: "כבר בחרת נושא להיום" }, { status: 409 });
  }

  // Check if someone from this room already submitted
  const roomEntry = existing.find((e) => e.roomNumber === user.roomNumber);
  if (roomEntry) {
    return NextResponse.json({ error: "מישהו מהחדר שלך כבר בחר נושא" }, { status: 409 });
  }

  const entry = await prisma.aktualiaEntry.create({
    data: {
      roomNumber: user.roomNumber,
      subject: normalizedSubject,
      date,
      userId,
    },
    include: { user: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true } } },
  });

  sendPushToAll({
    title: "אקטואליה - נושא חדש",
    body: `חדר ${user.roomNumber}: ${normalizedSubject}`,
    url: "/aktualia",
    tag: `aktualia-${entry.id}`,
  }, userId).catch(() => {});

  return NextResponse.json(entry);
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
  const entry = await prisma.aktualiaEntry.findUnique({ where: { id } });
  if (!entry || (entry.userId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.aktualiaEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
