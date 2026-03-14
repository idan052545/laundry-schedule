import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  roomNumber: true,
  team: true,
  phone: true,
  birthDate: true,
  foodPreference: true,
  allergies: true,
  medicalExemptions: true,
  otherExemptions: true,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: body.name,
      roomNumber: body.roomNumber || null,
      team: body.team ? parseInt(body.team) : null,
      phone: body.phone || null,
      birthDate: body.birthDate || null,
      foodPreference: body.foodPreference || null,
      allergies: body.allergies || null,
      medicalExemptions: body.medicalExemptions || null,
      otherExemptions: body.otherExemptions || null,
    },
    select: userSelect,
  });

  return NextResponse.json(user);
}
