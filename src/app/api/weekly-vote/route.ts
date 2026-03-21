import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function getCurrentWeek(): string {
  const now = new Date();
  // Get ISO week number
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getWeekDateRange(week: string): { start: Date; end: Date } {
  const [yearStr, wStr] = week.split("-W");
  const year = parseInt(yearStr);
  const weekNum = parseInt(wStr);
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayOfWeek1 = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  const start = new Date(mondayOfWeek1.getTime() + (weekNum - 1) * 7 * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  return { start, end };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") || getCurrentWeek();

  const currentWeek = getCurrentWeek();
  const isCurrentWeek = week === currentWeek;
  const { start, end } = getWeekDateRange(week);

  // Get all votes for this week
  const votes = await prisma.weeklyVote.findMany({
    where: { week },
    include: {
      voter: { select: { id: true, name: true, nameEn: true, image: true } },
      nominee: { select: { id: true, name: true, nameEn: true, image: true } },
    },
  });

  // Check if current user voted this week
  const userVote = votes.find((v) => v.voterId === userId);

  // Build leaderboard
  const nomineeMap = new Map<string, { user: { id: string; name: string; image: string | null }; votes: number; reasons: string[] }>();
  for (const v of votes) {
    const existing = nomineeMap.get(v.nomineeId);
    if (existing) {
      existing.votes++;
      if (v.reason) existing.reasons.push(v.reason);
    } else {
      nomineeMap.set(v.nomineeId, {
        user: v.nominee,
        votes: 1,
        reasons: v.reason ? [v.reason] : [],
      });
    }
  }

  const leaderboard = [...nomineeMap.values()]
    .sort((a, b) => b.votes - a.votes)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  // Get all users for voting dropdown (exclude commanders & simulator users)
  const EXCLUDED_ROLES = ["sagal", "simulator", "simulator-admin"];
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: EXCLUDED_ROLES } },
    select: { id: true, name: true, nameEn: true, image: true },
    orderBy: { name: "asc" },
  });

  // Total voters and total users
  const totalUsers = allUsers.length;
  const totalVoters = votes.length;

  return NextResponse.json({
    week,
    isCurrentWeek,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    userVote: userVote ? { nomineeId: userVote.nomineeId, reason: userVote.reason } : null,
    leaderboard,
    totalVoters,
    totalUsers,
    allUsers,
    // Only show who voted for whom after week ends or if viewing past weeks
    showDetails: !isCurrentWeek,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { nomineeId, reason } = body;

  if (!nomineeId) {
    return NextResponse.json({ error: "חסר נבחר" }, { status: 400 });
  }

  if (nomineeId === userId) {
    return NextResponse.json({ error: "לא ניתן להצביע לעצמך" }, { status: 400 });
  }

  const week = getCurrentWeek();

  const vote = await prisma.weeklyVote.upsert({
    where: { week_voterId: { week, voterId: userId } },
    create: { week, voterId: userId, nomineeId, reason: reason || null },
    update: { nomineeId, reason: reason || null },
    include: {
      nominee: { select: { id: true, name: true, nameEn: true, image: true } },
    },
  });

  return NextResponse.json(vote);
}
