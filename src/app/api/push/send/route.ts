import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers, sendPushToAll } from "@/lib/push";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "admin" && user.role !== "commander")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { title, body, url, userIds, team } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: "נא למלא כותרת ותוכן" }, { status: 400 });
  }

  const payload = { title, body, url: url || "/dashboard", tag: `admin-${Date.now()}` };

  let results;

  if (userIds && userIds.length > 0) {
    // Send to specific users
    results = await sendPushToUsers(userIds, payload);
  } else if (team) {
    // Send to specific team
    const teamUsers = await prisma.user.findMany({
      where: { team: parseInt(team) },
      select: { id: true },
    });
    results = await sendPushToUsers(teamUsers.map((u) => u.id), payload);
  } else {
    // Send to all
    results = await sendPushToAll(payload, userId);
  }

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ succeeded, failed, total: results.length });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "admin" && user.role !== "commander")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  // Get subscription stats
  const totalSubscriptions = await prisma.pushSubscription.count();
  const uniqueUsers = await prisma.pushSubscription.groupBy({
    by: ["userId"],
  });

  // Get per-team stats
  const subscribedUserIds = uniqueUsers.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: subscribedUserIds } },
    select: { team: true },
  });

  const teamStats: Record<string, number> = {};
  users.forEach((u) => {
    const key = u.team ? `צוות ${u.team}` : "ללא צוות";
    teamStats[key] = (teamStats[key] || 0) + 1;
  });

  return NextResponse.json({
    totalSubscriptions,
    uniqueUsers: uniqueUsers.length,
    teamStats,
  });
}
