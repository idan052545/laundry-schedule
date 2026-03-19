import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list sessions (own sessions, or all if admin)
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");
  const isAdmin = ["עידן חן סימנטוב", "דולב כהן"].includes(user.name);

  // Always filter by own user - each person sees only their own sessions/scores
  // Admins can see all only if they pass ?all=true
  const showAll = isAdmin && searchParams.get("all") === "true";
  const sessions = await prisma.simSession.findMany({
    where: {
      ...(showAll ? {} : { userId: user.id }),
      ...(scenarioId ? { scenarioId } : {}),
    },
    include: {
      scenario: { select: { title: true, conflictCharacter: true, machineName: true, difficulty: true } },
      user: { select: { name: true, image: true, team: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(sessions);
}

// POST - create new session (start simulation)
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const session = await prisma.simSession.create({
    data: {
      scenarioId: body.scenarioId,
      userId: user.id,
      mode: body.mode || "chat",
      messages: "[]",
    },
    include: {
      scenario: true,
    },
  });

  return NextResponse.json(session);
}

// PUT - update session (save messages, complete, score)
export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;

  // Verify ownership
  const existing = await prisma.simSession.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== user.id && !["עידן חן סימנטוב", "דולב כהן"].includes(user.name)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (data.status === "completed" && !existing.completedAt) {
    data.completedAt = new Date();
  }

  const session = await prisma.simSession.update({
    where: { id },
    data,
    include: {
      scenario: true,
    },
  });

  return NextResponse.json(session);
}
