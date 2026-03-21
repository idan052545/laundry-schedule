import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const machines = await prisma.machine.findMany({
    include: {
      bookings: {
        where: { status: "active" },
        include: {
          user: { select: { id: true, name: true, nameEn: true, image: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(machines);
}
