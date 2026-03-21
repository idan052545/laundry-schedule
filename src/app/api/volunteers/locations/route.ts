import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — distinct locations used in volunteer requests
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const results = await prisma.volunteerRequest.findMany({
    where: { location: { not: null } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const locations = results.map(r => r.location).filter(Boolean) as string[];
  return NextResponse.json([...new Set(locations)]);
}
