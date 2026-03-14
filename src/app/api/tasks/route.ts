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
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};

  if (from && to) {
    where.startDate = {
      gte: new Date(from),
      lte: new Date(to),
    };
  } else if (from) {
    where.startDate = { gte: new Date(from) };
  }

  if (category && category !== "all") {
    where.category = category;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(tasks);
}
