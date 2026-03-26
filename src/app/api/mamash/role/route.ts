import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/** GET — who is the active ממ״ש for a team */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const team = Number(searchParams.get("team"));
  if (!team) return NextResponse.json({ error: "חסר צוות" }, { status: 400 });

  const role = await prisma.mamashRole.findFirst({
    where: { team, active: true },
    include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ role });
}

/** POST — self-activate as ממ״ש for my team */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true } });
  if (!user?.team) return NextResponse.json({ error: "אין צוות משויך" }, { status: 400 });

  const body = await request.json();
  const team = body.team || user.team;

  // Compute current week start (Sunday) and end (Saturday)
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);

  const weekStart = sun.toISOString().split("T")[0];
  const weekEnd = sat.toISOString().split("T")[0];

  // Deactivate previous ממ״ש for this team
  await prisma.mamashRole.updateMany({
    where: { team, active: true },
    data: { active: false },
  });

  // Create new active role
  const role = await prisma.mamashRole.upsert({
    where: { team_weekStart: { team, weekStart } },
    create: { userId, team, weekStart, weekEnd, active: true },
    update: { userId, active: true, weekEnd },
    include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true } } },
  });

  return NextResponse.json({ role });
}

/** DELETE — deactivate ממ״ש role */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const team = Number(searchParams.get("team"));

  await prisma.mamashRole.updateMany({
    where: { userId, team: team || undefined, active: true },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
