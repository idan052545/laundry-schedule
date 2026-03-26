import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getMamashOrAdmin(userId: string, team: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  if (isAdmin) return true;
  const role = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  return !!role;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const team = Number(searchParams.get("team"));
  const weekStart = searchParams.get("weekStart");
  const status = searchParams.get("status");

  if (!team || !weekStart) return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });

  const where: Record<string, unknown> = { team, weekStart };
  if (status && status !== "all") where.status = status;

  const requirements = await prisma.scheduleRequirement.findMany({
    where,
    include: {
      targetUser: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ requirements });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { team, weekStart, type, title, description, targetUserId, duration, priority } = body;

  if (!team || !weekStart || !type || !title) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  const hasAccess = await getMamashOrAdmin(userId, team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const requirement = await prisma.scheduleRequirement.create({
    data: {
      team,
      weekStart,
      type,
      title,
      description: description || null,
      targetUserId: targetUserId || null,
      duration: duration || 10,
      priority: priority || "normal",
      createdById: userId,
    },
    include: {
      targetUser: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
    },
  });

  return NextResponse.json({ requirement });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const existing = await prisma.scheduleRequirement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const hasAccess = await getMamashOrAdmin(userId, existing.team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const requirement = await prisma.scheduleRequirement.update({
    where: { id },
    data: updates,
    include: {
      targetUser: { select: { id: true, name: true, nameEn: true, image: true, team: true } },
    },
  });

  return NextResponse.json({ requirement });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const existing = await prisma.scheduleRequirement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const hasAccess = await getMamashOrAdmin(userId, existing.team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  await prisma.scheduleRequirement.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
