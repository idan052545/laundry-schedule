import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — volunteer statistics
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month"; // day, week, month
  const team = searchParams.get("team"); // optional team filter

  const now = new Date();
  let since: Date;
  if (period === "day") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const where: Record<string, unknown> = {
    status: { in: ["completed", "active", "assigned"] },
    createdAt: { gte: since },
    request: { status: { not: "cancelled" } },
  };
  if (team) {
    where.user = { team: parseInt(team) };
  }

  const assignments = await prisma.volunteerAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, team: true, image: true } },
      request: { select: { title: true, startTime: true, endTime: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Per-user stats
  const userMap = new Map<string, {
    id: string; name: string; team: number | null; image: string | null;
    count: number; totalMinutes: number; categories: Record<string, number>;
  }>();

  for (const a of assignments) {
    const start = a.actualStartTime || a.request.startTime;
    const end = a.actualEndTime || a.request.endTime;
    const minutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);

    if (!userMap.has(a.userId)) {
      userMap.set(a.userId, {
        id: a.user.id, name: a.user.name || "", team: a.user.team,
        image: a.user.image, count: 0, totalMinutes: 0, categories: {},
      });
    }
    const u = userMap.get(a.userId)!;
    u.count++;
    u.totalMinutes += minutes;
    u.categories[a.request.category] = (u.categories[a.request.category] || 0) + 1;
  }

  const leaderboard = Array.from(userMap.values()).sort((a, b) => b.count - a.count);

  // Team totals
  const teamTotals: Record<number, { count: number; minutes: number }> = {};
  for (const u of leaderboard) {
    const t = u.team || 0;
    if (!teamTotals[t]) teamTotals[t] = { count: 0, minutes: 0 };
    teamTotals[t].count += u.count;
    teamTotals[t].minutes += u.totalMinutes;
  }

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const a of assignments) {
    categoryTotals[a.request.category] = (categoryTotals[a.request.category] || 0) + 1;
  }

  // Feedback stats
  const feedbackStats = await prisma.volunteerFeedback.aggregate({
    where: { createdAt: { gte: since } },
    _avg: { rating: true },
    _count: true,
  });

  return NextResponse.json({
    period,
    since: since.toISOString(),
    totalAssignments: assignments.length,
    leaderboard,
    teamTotals,
    categoryTotals,
    averageRating: feedbackStats._avg.rating,
    feedbackCount: feedbackStats._count,
  });
}
