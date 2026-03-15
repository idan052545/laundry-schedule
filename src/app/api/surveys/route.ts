import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers, sendPushToAll } from "@/lib/push";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true, role: true, email: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const scope = searchParams.get("scope"); // "platoon" = only platoon-wide, "team" = only team, null = both

  // Build where clause
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;

  if (scope === "platoon") {
    // Only platoon-wide surveys (team=0)
    where.team = 0;
  } else if (scope === "team" && user?.team) {
    // Only team surveys
    where.team = user.team;
  } else if (user?.team) {
    // Both: user's team + platoon-wide
    where.OR = [{ team: user.team }, { team: 0 }];
  } else {
    // No team — only platoon-wide
    where.team = 0;
  }

  const surveys = await prisma.survey.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      responses: {
        include: { user: { select: { id: true, name: true, image: true, team: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get relevant members
  let teamMembers;
  if (scope === "team" && user?.team) {
    // Only team members for team-scoped view
    teamMembers = await prisma.user.findMany({
      where: { team: user.team },
      select: { id: true, name: true, image: true, team: true },
      orderBy: { name: "asc" },
    });
  } else {
    // All users for platoon or mixed views
    teamMembers = await prisma.user.findMany({
      select: { id: true, name: true, image: true, team: true },
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json({ surveys, teamMembers, userTeam: user?.team, isAdmin });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { team: true, role: true, email: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  const body = await request.json();
  const { title, description, type, options, platoon } = body;

  if (!title || !type) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  if ((type === "single" || type === "multi") && (!options || options.length < 2)) {
    return NextResponse.json({ error: "נדרשות לפחות 2 אפשרויות" }, { status: 400 });
  }

  // Platoon-wide survey requires commander/admin
  const surveyTeam = platoon ? 0 : (user?.team || 0);
  if (platoon && !isAdmin) {
    return NextResponse.json({ error: "רק מפקדים יכולים ליצור סקר פלוגתי" }, { status: 403 });
  }
  if (!platoon && !user?.team) {
    return NextResponse.json({ error: "לא משויך לצוות" }, { status: 403 });
  }

  const survey = await prisma.survey.create({
    data: {
      title,
      description: description || null,
      team: surveyTeam,
      type,
      options: type === "yes_no" ? null : JSON.stringify(options),
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      responses: { include: { user: { select: { id: true, name: true, image: true, team: true } } } },
    },
  });

  // Notify
  if (platoon) {
    await sendPushToAll({
      title: "סקר חדש לכל הפלוגה",
      body: title,
      url: "/surveys",
      tag: `survey-new-${survey.id}`,
    }, userId).catch(() => {});
  } else {
    const members = await prisma.user.findMany({
      where: { team: user!.team!, id: { not: userId } },
      select: { id: true },
    });
    if (members.length > 0) {
      await sendPushToUsers(members.map((m) => m.id), {
        title: "סקר חדש בצוות",
        body: title,
        url: "/surveys",
        tag: `survey-new-${survey.id}`,
      }).catch(() => {});
    }
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
  const { id, action, answer, title, description, options } = body;

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

    let members;
    if (survey.team === 0) {
      // Platoon-wide: remind all who haven't responded
      members = await prisma.user.findMany({
        where: { id: { notIn: respondedIds } },
        select: { id: true },
      });
    } else {
      members = await prisma.user.findMany({
        where: { team: survey.team, id: { notIn: respondedIds } },
        select: { id: true },
      });
    }

    if (members.length > 0) {
      await sendPushToUsers(members.map((m) => m.id), {
        title: "תזכורת: סקר ממתין",
        body: survey.title,
        url: "/surveys",
        tag: `survey-remind-${id}`,
      }).catch(() => {});
    }
    return NextResponse.json({ reminded: members.length });
  }

  // Edit survey (title, description, options)
  if (action === "edit") {
    if (survey.createdById !== userId) {
      return NextResponse.json({ error: "רק יוצר הסקר יכול לערוך" }, { status: 403 });
    }
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (options !== undefined) data.options = options ? JSON.stringify(options) : null;
    await prisma.survey.update({ where: { id }, data });
  }

  // Return updated survey
  const updated = await prisma.survey.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      responses: { include: { user: { select: { id: true, name: true, image: true, team: true } } } },
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
