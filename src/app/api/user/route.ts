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
  role: true,
  language: true,
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
      ...(body.name !== undefined && { name: body.name }),
      ...(body.roomNumber !== undefined && { roomNumber: body.roomNumber || null }),
      ...(body.team !== undefined && { team: body.team ? parseInt(body.team) : null }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.birthDate !== undefined && { birthDate: body.birthDate || null }),
      ...(body.foodPreference !== undefined && { foodPreference: body.foodPreference || null }),
      ...(body.allergies !== undefined && { allergies: body.allergies || null }),
      ...(body.medicalExemptions !== undefined && { medicalExemptions: body.medicalExemptions || null }),
      ...(body.otherExemptions !== undefined && { otherExemptions: body.otherExemptions || null }),
      ...(body.language !== undefined && { language: body.language }),
    },
    select: userSelect,
  });

  return NextResponse.json(user);
}
