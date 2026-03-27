import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

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
    const { israelDayRange } = await import("@/lib/israel-tz");
    const { dayStart, dayEnd } = israelDayRange(dateStr);
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
  const { title, description, target, targetDetails, requiredCount, startTime, endTime, category, priority, allowPartial, location, isRetro } = body;

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
      requiredCount: isRetro ? 1 : (requiredCount || 1),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      category: category || "other",
      priority: isRetro ? "normal" : (priority || "normal"),
      isCommanderRequest: isCommander,
      allowPartial: !!allowPartial,
      location: location || null,
      status: isRetro ? "completed" : "open",
    },
    include: {
      createdBy: { select: { id: true, name: true, nameEn: true, image: true, team: true, role: true } },
      assignments: true,
    },
  });

  // Auto-assign creator for retro requests
  if (isRetro) {
    await prisma.volunteerAssignment.create({
      data: { requestId: req.id, userId, assignmentType: "self", status: "completed" },
    });
  }

  // Update title history
  await prisma.volunteerTitleHistory.upsert({
    where: { title },
    update: { usageCount: { increment: 1 }, lastUsed: new Date(), category: category || "other" },
    create: { title, category: category || "other" },
  });

  // Skip notifications for retro requests
  if (isRetro) return NextResponse.json(req);

  // Send notifications
  const startStr = new Date(startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
  const notifBody = `${user?.name}: ${title} (${startStr})${priority === "urgent" ? " — דחוף!" : ""}`;

  // Build eligible user filter: exclude sagals (they can't volunteer)
  const notifTitle = isCommander ? "התנדבות חדשה (מפקד)" : "בקשת עזרה חדשה";
  const notifPayload = { title: notifTitle, body: notifBody, url: "/volunteers", tag: `volunteer-new-${req.id}` };

  if (target === "all") {
    const eligibleUsers = await prisma.user.findMany({
      where: { id: { not: userId }, role: { not: "sagal" } },
      select: { id: true },
    });
    const ids = eligibleUsers.map((u: { id: string }) => u.id);
    if (ids.length > 0) await sendPushToUsers(ids, notifPayload);
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
        where: { team: { in: teamNums }, role: { not: "sagal" } },
        select: { id: true },
      });
      const ids = teamUsers.map((u: { id: string }) => u.id).filter((id: string) => id !== userId);
      if (ids.length > 0) await sendPushToUsers(ids, notifPayload);
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
      await sendPushToUsers(assignments.map((a: { userId: string }) => a.userId), {
        title: "תזכורת — התנדבות עוד מעט!",
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
      await sendPushToUsers(assignments.map((a: { userId: string }) => a.userId), {
        title: "התנדבות הסתיימה",
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
    const notifTarget = updated.target || req.target;
    const notifData = { title: "התנדבות דורשת מתנדבים", body: notifyBody, url: "/volunteers", tag: `volunteer-notify-${id}` };
    if (notifTarget === "all") {
      const eligible = await prisma.user.findMany({ where: { id: { not: userId }, role: { not: "sagal" } }, select: { id: true } });
      const eIds = eligible.map((u: { id: string }) => u.id);
      if (eIds.length > 0) await sendPushToUsers(eIds, notifData);
    } else {
      const teams: number[] = [];
      if (notifTarget.startsWith("team-")) teams.push(parseInt(notifTarget.replace("team-", "")));
      else if (notifTarget === "mixed" && req.targetDetails) {
        try { JSON.parse(req.targetDetails as string).forEach((d: { team: number }) => teams.push(d.team)); } catch { /* ignore */ }
      }
      if (teams.length > 0) {
        const targetUsers = await prisma.user.findMany({ where: { team: { in: teams }, role: { not: "sagal" } }, select: { id: true } });
        const ids = targetUsers.map((u: { id: string }) => u.id).filter((uid: string) => uid !== userId);
        if (ids.length > 0) await sendPushToUsers(ids, notifData);
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
