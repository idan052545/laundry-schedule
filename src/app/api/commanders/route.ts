import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const commanders = await prisma.user.findMany({
    where: {
      OR: [{ role: "commander" }, { role: "admin" }],
    },
    select: {
      id: true,
      name: true,
      image: true,
      roleTitle: true,
      role: true,
      _count: { select: { commanderPosts: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(commanders);
}
