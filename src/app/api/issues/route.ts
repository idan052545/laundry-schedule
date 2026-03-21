import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

const STATUS_LABELS: Record<string, string> = {
  new: "חדשה",
  open: "פתוחה",
  urgent: "דחופה",
  closed: "סגורה",
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const createdById = searchParams.get("createdById");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (createdById) where.createdById = createdById;

  const issues = await prisma.issue.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true, phone: true } },
      assignees: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true } } },
      },
      comments: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Summary counts
  const summary = {
    total: issues.length,
    new: issues.filter((i) => i.status === "new").length,
    open: issues.filter((i) => i.status === "open").length,
    urgent: issues.filter((i) => i.status === "urgent").length,
    closed: issues.filter((i) => i.status === "closed").length,
  };

  return NextResponse.json({ issues, summary, isAdmin });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { title, description, location, imageUrl, companion, companionPhone, assigneeIds } = body;

  if (!title) {
    return NextResponse.json({ error: "חסרה כותרת" }, { status: 400 });
  }

  const issue = await prisma.issue.create({
    data: {
      title,
      description: description || null,
      location: location || null,
      imageUrl: imageUrl || null,
      companion: companion || null,
      companionPhone: companionPhone || null,
      createdById: userId,
      assignees: assigneeIds?.length
        ? { create: assigneeIds.map((uid: string) => ({ userId: uid })) }
        : undefined,
    },
    include: {
      createdBy: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true, phone: true } },
      assignees: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true } } },
      },
      comments: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Notify the קלפ commander about new issue
  const klapCommanders = await prisma.user.findMany({
    where: { roleTitle: { contains: "קלפ" } },
    select: { id: true },
  });
  if (klapCommanders.length > 0) {
    const klapIds = klapCommanders.map((c) => c.id).filter((id) => id !== userId);
    if (klapIds.length > 0) {
      await sendPushToUsers(klapIds, {
        title: "תקלה חדשה",
        body: `${title}${location ? ` | ${location}` : ""}`,
        url: "/issues",
        tag: `issue-new-${issue.id}`,
      }).catch(() => {});
    }
  }

  return NextResponse.json(issue);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true, roleTitle: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  const body = await request.json();
  const { id, action, status: newStatus, assigneeIds, comment, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const existing = await prisma.issue.findUnique({
    where: { id },
    include: { assignees: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "תקלה לא נמצאה" }, { status: 404 });
  }

  // Only admin/commander or creator can modify
  const isCreator = existing.createdById === userId;
  if (!isAdmin && !isCreator) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  // Status change
  if (action === "status" && newStatus) {
    await prisma.issue.update({ where: { id }, data: { status: newStatus } });

    // Notify creator + assignees about status change
    const notifyIds = new Set<string>();
    notifyIds.add(existing.createdById);
    existing.assignees.forEach((a) => notifyIds.add(a.userId));
    notifyIds.delete(userId); // Don't notify self

    if (notifyIds.size > 0) {
      await sendPushToUsers([...notifyIds], {
        title: `סטטוס תקלה עודכן`,
        body: `${existing.title} → ${STATUS_LABELS[newStatus] || newStatus}`,
        url: "/issues",
        tag: `issue-status-${id}`,
      }).catch(() => {});
    }
  }

  // Assign users
  if (action === "assign" && assigneeIds) {
    await prisma.issueAssignee.deleteMany({ where: { issueId: id } });
    if (assigneeIds.length > 0) {
      await prisma.issueAssignee.createMany({
        data: assigneeIds.map((uid: string) => ({ issueId: id, userId: uid })),
      });

      // Notify newly assigned
      const newAssignees = assigneeIds.filter((uid: string) => uid !== userId);
      if (newAssignees.length > 0) {
        await sendPushToUsers(newAssignees, {
          title: "שובצת לתקלה",
          body: existing.title,
          url: "/issues",
          tag: `issue-assign-${id}`,
        }).catch(() => {});
      }
    }
  }

  // Add comment
  if (action === "comment" && comment) {
    await prisma.issueComment.create({
      data: { issueId: id, userId, content: comment },
    });

    // Notify creator + assignees about comment
    const notifyIds = new Set<string>();
    notifyIds.add(existing.createdById);
    existing.assignees.forEach((a) => notifyIds.add(a.userId));
    notifyIds.delete(userId);

    if (notifyIds.size > 0) {
      await sendPushToUsers([...notifyIds], {
        title: "תגובה חדשה לתקלה",
        body: existing.title,
        url: "/issues",
        tag: `issue-comment-${id}`,
      }).catch(() => {});
    }
  }

  // General update (title, description, location, etc.)
  if (action === "update") {
    const data: Record<string, unknown> = {};
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description || null;
    if (updateData.location !== undefined) data.location = updateData.location || null;
    if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl || null;
    if (updateData.companion !== undefined) data.companion = updateData.companion || null;
    if (updateData.companionPhone !== undefined) data.companionPhone = updateData.companionPhone || null;

    await prisma.issue.update({ where: { id }, data });
  }

  // Return updated issue
  const updated = await prisma.issue.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true, phone: true } },
      assignees: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true, roomNumber: true } } },
      },
      comments: {
        include: { user: { select: { id: true, name: true, nameEn: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  const isAdmin = user?.email === "ohad@dotan.com" || user?.role === "admin" || user?.role === "commander";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) {
    return NextResponse.json({ error: "תקלה לא נמצאה" }, { status: 404 });
  }

  if (!isAdmin && issue.createdById !== userId) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.issue.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
