import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

const DANA_EMAIL = "dana@dotan.com";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;

  const [todayQuote, yesterdayQuote] = await Promise.all([
    prisma.dailyQuote.findUnique({
      where: { date: todayStr },
      include: { user: { select: { name: true, nameEn: true, team: true } } },
    }),
    prisma.dailyQuote.findUnique({
      where: { date: yesterdayStr },
      include: { user: { select: { name: true, nameEn: true, team: true } } },
    }),
  ]);

  // Check if current user is Dana
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  const isDana = user?.email === DANA_EMAIL || user?.name === "דנה פרידמן";

  return NextResponse.json({
    todayQuote,
    yesterdayQuote,
    isDana,
    todayStr,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, team: true },
  });

  if (user?.email !== DANA_EMAIL && user?.name !== "דנה פרידמן") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "חסר טקסט" }, { status: 400 });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

  const quote = await prisma.dailyQuote.upsert({
    where: { date: todayStr },
    update: { text: text.trim(), userId },
    create: { text: text.trim(), date: todayStr, userId },
    include: { user: { select: { name: true, team: true } } },
  });

  // Send push notification to everyone
  sendPushToAll(
    {
      title: "משפט היומי",
      body: text.trim().length > 80 ? text.trim().slice(0, 80) + "..." : text.trim(),
      url: "/daily-quote",
    },
    userId
  ).catch(() => {});

  return NextResponse.json(quote);
}
