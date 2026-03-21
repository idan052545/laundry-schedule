import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers, sendPushToAll } from "@/lib/push";

// GET — list volunteer requests
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "open";
  const dateStr = searchParams.get("date");

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (dateStr) {
    const dayStart = new Date(dateStr + "T00:00:00Z");
    const dayEnd = new Date(dateStr + "T23:59:59Z");
    where.startTime = { lte: dayEnd };
    where.endTime = { gte: dayStart };
  }

  // Auto-complete requests whose endTime has passed
  const expired = await prisma.volunteerRequest.findMany({
    where: { status: { in: ["open", "filled", "in-progress"] }, endTime: { lt: new Date() } },
    select: { id: true },
  });
  if (expired.length > 0) {
    const expiredIds = expired.map((r: { id: string }) => r.id);
    await prisma.$transaction([
      prisma.volunteerRequest.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "completed" },
      }),
      prisma.volunteerAssignment.updateMany({
        where: { requestId: { in: expiredIds }, status: { in: ["assigned", "active"] } },
        data: { status: "completed" },
      }),
    ]);
  }

  const requests = await prisma.volunteerRequest.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, nameEn: true, image: true, team: true, role: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true, team: true } } },
      },
      replacements: { where: { status: "seeking" }, select: { id: true, isUrgent: true, originalUserId: true } },
      feedback: {
        select: { id: true, rating: true, type: true, comment: true, user: { select: { name: true, nameEn: true, image: true } } },
        orderBy: { createdAt: "desc" as const },
      },
      _count: { select: { feedback: true } },
    },
    orderBy: [{ priority: "desc" }, { startTime: "asc" }],
  });

  return NextResponse.json(requests);
}

// POST — create volunteer request
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, team: true } });

  const body = await request.json();
  const { title, description, target, targetDetails, requiredCount, startTime, endTime, category, priority, allowPartial, location } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json({ error: "חסר שם, שעת התחלה או סיום" }, { status: 400 });
  }

  const isCommander = user?.role === "admin" || user?.role === "commander";

  const req = await prisma.volunteerRequest.create({
    data: {
      title,
      description: description || null,
      createdById: userId,
      target: target || "all",
      targetDetails: targetDetails ? JSON.stringify(targetDetails) : null,
      requiredCount: requiredCount || 1,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      category: category || "other",
      priority: priority || "normal",
      isCommanderRequest: isCommander,
      allowPartial: !!allowPartial,
      location: location || null,
    },
    include: {
      createdBy: { select: { id: true, name: true, nameEn: true, image: true, team: true, role: true } },
      assignments: true,
    },
  });

  // Update title history
  await prisma.volunteerTitleHistory.upsert({
    where: { title },
    update: { usageCount: { increment: 1 }, lastUsed: new Date(), category: category || "other" },
    create: { title, category: category || "other" },
  });

  // Send notifications
  const startStr = new Date(startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
  const notifBody = `${user?.name}: ${title} (${startStr})${priority === "urgent" ? " — דחוף!" : ""}`;

  if (target === "all") {
    await sendPushToAll({
      title: isCommander ? "תורנות חדשה (מפקד)" : "בקשת עזרה חדשה",
      body: notifBody,
      url: "/volunteers",
      tag: `volunteer-new-${req.id}`,
    }, userId);
  } else {
    // Send to specific team(s)
    let teamNums: number[] = [];
    if (target.startsWith("team-")) {
      teamNums = [parseInt(target.replace("team-", ""))];
    } else if (target === "mixed" && targetDetails) {
      teamNums = targetDetails.map((d: { team: number }) => d.team);
    }
    if (teamNums.length > 0) {
      const teamUsers = await prisma.user.findMany({
        where: { team: { in: teamNums } },
        select: { id: true },
      });
      const ids = teamUsers.map(u => u.id).filter(id => id !== userId);
      if (ids.length > 0) {
        await sendPushToUsers(ids, {
          title: isCommander ? "תורנות חדשה (מפקד)" : "בקשת עזרה חדשה",
          body: notifBody,
          url: "/volunteers",
          tag: `volunteer-new-${req.id}`,
        });
      }
    }
  }

  return NextResponse.json(req);
}

// PUT — update request status
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { id, status, title, description, startTime, endTime, requiredCount, notify, notifyBody, remindAssigned, location } = body;

  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const req = await prisma.volunteerRequest.findUnique({ where: { id } });
  if (!req) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  // Only creator or admin can update
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (req.createdById !== userId && user?.role !== "admin" && user?.role !== "commander") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (title) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (startTime) data.startTime = new Date(startTime);
  if (endTime) data.endTime = new Date(endTime);
  if (requiredCount) data.requiredCount = requiredCount;
  if (location !== undefined) data.location = location || null;

  // Remind assigned users to come
  if (remindAssigned) {
    const assignments = await prisma.volunteerAssignment.findMany({
      where: { requestId: id, status: { in: ["assigned", "active"] } },
      select: { userId: true },
    });
    if (assignments.length > 0) {
      const startStr = new Date(req.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      const locationStr = req.location ? ` | ${req.location}` : "";
      await sendPushToUsers(assignments.map(a => a.userId), {
        title: "תזכורת — תורנות עוד מעט!",
        body: `${req.title} ב-${startStr}${locationStr}`,
        url: "/volunteers",
        tag: `volunteer-remind-${id}`,
      });
    }
    return NextResponse.json({ reminded: assignments.length });
  }

  const updated = await prisma.volunteerRequest.update({ where: { id }, data });

  // If completed, notify assignees for feedback
  if (status === "completed") {
    const assignments = await prisma.volunteerAssignment.findMany({
      where: { requestId: id, status: { in: ["assigned", "active", "completed"] } },
      select: { userId: true },
    });
    if (assignments.length > 0) {
      await sendPushToUsers(assignments.map(a => a.userId), {
        title: "תורנות הסתיימה",
        body: `${req.title} — דרגו את החוויה`,
        url: "/volunteers",
        tag: `volunteer-feedback-${id}`,
      });
      // Mark all assignments as completed
      await prisma.volunteerAssignment.updateMany({
        where: { requestId: id, status: { in: ["assigned", "active"] } },
        data: { status: "completed" },
      });
    }
  }

  // Send push notification about this request
  if (notify && notifyBody) {
    const target = updated.target || req.target;
    if (target === "all") {
      await sendPushToAll({
        title: "תורנות דורשת מתנדבים",
        body: notifyBody,
        url: "/volunteers",
        tag: `volunteer-notify-${id}`,
      }, userId);
    } else {
      const teams: number[] = [];
      if (target.startsWith("team-")) teams.push(parseInt(target.replace("team-", "")));
      else if (target === "mixed" && req.targetDetails) {
        try { JSON.parse(req.targetDetails as string).forEach((d: { team: number }) => teams.push(d.team)); } catch { /* ignore */ }
      }
      if (teams.length > 0) {
        const targetUsers = await prisma.user.findMany({ where: { team: { in: teams } }, select: { id: true } });
        const ids = targetUsers.map(u => u.id).filter(uid => uid !== userId);
        if (ids.length > 0) {
          await sendPushToUsers(ids, {
            title: "תורנות דורשת מתנדבים",
            body: notifyBody,
            url: "/volunteers",
            tag: `volunteer-notify-${id}`,
          });
        }
      }
    }
  }

  return NextResponse.json(updated);
}

// DELETE — cancel request
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const req = await prisma.volunteerRequest.findUnique({ where: { id } });
  if (!req) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (req.createdById !== userId && user?.role !== "admin" && user?.role !== "commander") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  // If cancelled or completed, permanently delete
  if (req.status === "cancelled" || req.status === "completed") {
    await prisma.volunteerRequest.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  }

  // Otherwise just cancel
  await prisma.$transaction([
    prisma.volunteerRequest.update({ where: { id }, data: { status: "cancelled" } }),
    prisma.volunteerAssignment.updateMany({
      where: { requestId: id, status: { in: ["assigned", "active"] } },
      data: { status: "cancelled" },
    }),
  ]);
  return NextResponse.json({ success: true });
}
