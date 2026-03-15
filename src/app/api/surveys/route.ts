import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true, role: true, email: true } });

  if (!user?.team) {
    return NextResponse.json({ error: "לא משויך לצוות" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { team: user.team };
  if (status && status !== "all") where.status = status;

  const surveys = await prisma.survey.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      responses: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get team members for "who didn't answer" feature
  const teamMembers = await prisma.user.findMany({
    where: { team: user.team },
    select: { id: true, name: true, image: true },
  });

  return NextResponse.json({ surveys, teamMembers, userTeam: user.team });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true } });

  if (!user?.team) {
    return NextResponse.json({ error: "לא משויך לצוות" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, type, options } = body;

  if (!title || !type) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if ((type === "single" || type === "multi") && (!options || options.length < 2)) {
    return NextResponse.json({ error: "נדרשות לפחות 2 אפשרויות" }, { status: 400 });
  }

  const survey = await prisma.survey.create({
    data: {
      title,
      description: description || null,
      team: user.team,
      type,
      options: type === "yes_no" ? null : JSON.stringify(options),
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      responses: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
  });

  // Notify team members
  const teamMembers = await prisma.user.findMany({
    where: { team: user.team, id: { not: userId } },
    select: { id: true },
  });
  if (teamMembers.length > 0) {
    await sendPushToUsers(teamMembers.map((m) => m.id), {
      title: "סקר חדש בצוות",
      body: title,
      url: "/surveys",
      tag: `survey-new-${survey.id}`,
    }).catch(() => {});
  }

  return NextResponse.json(survey);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { id, action, answer } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { responses: true },
  });

  if (!survey) {
    return NextResponse.json({ error: "סקר לא נמצא" }, { status: 404 });
  }

  // Vote/respond
  if (action === "respond") {
    if (survey.status === "closed") {
      return NextResponse.json({ error: "הסקר סגור" }, { status: 400 });
    }

    await prisma.surveyResponse.upsert({
      where: { surveyId_userId: { surveyId: id, userId } },
      create: { surveyId: id, userId, answer: JSON.stringify(answer) },
      update: { answer: JSON.stringify(answer) },
    });
  }

  // Close survey
  if (action === "close") {
    if (survey.createdById !== userId) {
      return NextResponse.json({ error: "רק יוצר הסקר יכול לסגור" }, { status: 403 });
    }
    await prisma.survey.update({ where: { id }, data: { status: "closed" } });
  }

  // Reopen survey
  if (action === "reopen") {
    if (survey.createdById !== userId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    await prisma.survey.update({ where: { id }, data: { status: "active" } });
  }

  // Remind non-responders
  if (action === "remind") {
    if (survey.createdById !== userId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const respondedIds = survey.responses.map((r) => r.userId);
    const teamMembers = await prisma.user.findMany({
      where: { team: survey.team, id: { notIn: respondedIds } },
      select: { id: true },
    });
    if (teamMembers.length > 0) {
      await sendPushToUsers(teamMembers.map((m) => m.id), {
        title: "תזכורת: סקר ממתין",
        body: survey.title,
        url: "/surveys",
        tag: `survey-remind-${id}`,
      }).catch(() => {});
    }
    return NextResponse.json({ reminded: teamMembers.length });
  }

  // Return updated survey
  const updated = await prisma.survey.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      responses: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey) {
    return NextResponse.json({ error: "סקר לא נמצא" }, { status: 404 });
  }

  if (survey.createdById !== userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
    const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
  }

  await prisma.survey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
