import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Only עידן סימנטוב (admin) can manage scenarios
async function getAdminUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.name !== "עידן חן סימנטוב") return null;
  return user;
}

// GET - list all scenarios (active only unless admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user?.name === "עידן חן סימנטוב";

  const scenarios = await prisma.simScenario.findMany({
    where: isAdmin ? {} : { active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(scenarios);
}

// POST - create scenario (admin only)
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const scenario = await prisma.simScenario.create({
    data: {
      title: body.title,
      description: body.description || null,
      conflictCharacter: body.conflictCharacter,
      machineName: body.machineName,
      relationship: body.relationship,
      servicenature: body.servicenature,
      objective: body.objective,
      machineMotivation: body.machineMotivation,
      keypoints: body.keypoints,
      difficulty: body.difficulty || 5,
      soldierGender: body.soldierGender || "female",
      gradeRequirements: body.gradeRequirements ? JSON.stringify(body.gradeRequirements) : null,
      skills: body.skills ? JSON.stringify(body.skills) : null,
    },
  });

  return NextResponse.json(scenario);
}

// PUT - update scenario (admin only)
export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { id, ...data } = body;

  if (data.gradeRequirements) data.gradeRequirements = JSON.stringify(data.gradeRequirements);
  if (data.skills) data.skills = JSON.stringify(data.skills);

  const scenario = await prisma.simScenario.update({
    where: { id },
    data,
  });

  return NextResponse.json(scenario);
}

// DELETE - delete scenario (admin only)
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.simScenario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
