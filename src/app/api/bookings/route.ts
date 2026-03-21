import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const machineId = searchParams.get("machineId");

  const where: Record<string, string> = {};
  if (date) where.date = date;
  if (machineId) where.machineId = machineId;

  const bookings = await prisma.booking.findMany({
    where: { ...where, status: "active" },
    include: {
      user: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true } },
      machine: true,
    },
    orderBy: { timeSlot: "asc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const { machineId, date, timeSlot } = await request.json();
    const userId = (session.user as { id: string }).id;

    const existing = await prisma.booking.findFirst({
      where: { machineId, date, timeSlot, status: "active" },
    });

    if (existing) {
      return NextResponse.json(
        { error: "המשבצת כבר תפוסה" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.create({
      data: { userId, machineId, date, timeSlot },
      include: {
        user: { select: { id: true, name: true, nameEn: true, image: true } },
        machine: true,
      },
    });

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת ההזמנה" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("id");
  const userId = (session.user as { id: string }).id;

  if (!bookingId) {
    return NextResponse.json({ error: "חסר מזהה הזמנה" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking || booking.userId !== userId) {
    return NextResponse.json({ error: "לא ניתן לבטל הזמנה זו" }, { status: 403 });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ success: true });
}
