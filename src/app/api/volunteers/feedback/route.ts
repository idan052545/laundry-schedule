import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST — submit feedback
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { requestId, rating, type, comment } = await request.json();

  if (!requestId || !rating || !type) {
    return NextResponse.json({ error: "חסר פרטים" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "דירוג חייב להיות 1-5" }, { status: 400 });
  }

  const feedback = await prisma.volunteerFeedback.upsert({
    where: { requestId_userId: { requestId, userId } },
    update: { rating, type, comment: comment || null },
    create: { requestId, userId, rating, type, comment: comment || null },
  });

  return NextResponse.json(feedback);
}
