import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function verifyMamash(userId: string, team: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  if (isAdmin) return true;
  const role = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  return !!role;
}

/** Toggle a platoon event as schedulable/blocked for a team */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { eventId, team, schedulable } = await request.json();

  if (!eventId || !team || typeof schedulable !== "boolean") {
    return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
  }

  const hasAccess = await verifyMamash(userId, team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const override = await prisma.eventOverride.upsert({
    where: { eventId_team: { eventId, team } },
    update: { schedulable, createdById: userId },
    create: { eventId, team, schedulable, createdById: userId },
  });

  return NextResponse.json({ ok: true, override });
}

/** Remove override (revert to auto-detect) */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const team = Number(searchParams.get("team"));

  if (!eventId || !team) return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });

  const hasAccess = await verifyMamash(userId, team);
  if (!hasAccess) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  await prisma.eventOverride.deleteMany({ where: { eventId, team } });
  return NextResponse.json({ ok: true });
}
