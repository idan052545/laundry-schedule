import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — get title autocomplete suggestions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const titles = await prisma.volunteerTitleHistory.findMany({
    orderBy: [{ usageCount: "desc" }, { lastUsed: "desc" }],
    take: 20,
  });

  return NextResponse.json(titles);
}
