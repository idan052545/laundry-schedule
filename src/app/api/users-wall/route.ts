import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");

  const where: Record<string, unknown> = {};
  if (team && team !== "all") {
    where.team = parseInt(team);
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      image: true,
      team: true,
      roomNumber: true,
      phone: true,
      birthDate: true,
      role: true,
      foodPreference: true,
      allergies: true,
      medicalExemptions: true,
      roleTitle: true,
    },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}
