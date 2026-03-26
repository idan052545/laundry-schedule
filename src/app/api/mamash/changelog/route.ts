import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const team = Number(searchParams.get("team"));

  if (!date || !team) return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });

  const changes = await prisma.scheduleChange.findMany({
    where: { team, date },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ changes });
}
