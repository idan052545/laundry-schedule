import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";

const formInclude = {
  author: { select: { id: true, name: true, image: true } },
  submissions: {
    include: { user: { select: { id: true, name: true, image: true, team: true } } },
    orderBy: { createdAt: "desc" as const },
  },
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

  const forms = await prisma.formLink.findMany({
    include: {
      author: { select: { id: true, name: true, image: true } },
      submissions: {
        include: { user: { select: { id: true, name: true, image: true, team: true } } },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // For recurring forms, only show today's submissions
  const filteredForms = forms.map((form) => {
    if (form.recurring) {
      return {
        ...form,
        submissions: form.submissions.filter((s) => s.date === todayStr),
      };
    }
    return form;
  });

  // Get all users for completion tracking (exclude simulator users)
  const EXCLUDED_ROLES = ["sagal", "simulator", "simulator-admin"];
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: EXCLUDED_ROLES } },
    select: { id: true, name: true, image: true, team: true },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ forms: filteredForms, allUsers });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { title, description, url, category, deadline } = await request.json();

  if (!title || !url) {
    return NextResponse.json({ error: "נא למלא כותרת וקישור" }, { status: 400 });
  }

  const form = await prisma.formLink.create({
    data: {
      title,
      description: description || null,
      url,
      category: category || "general",
      deadline: deadline || null,
      authorId: userId,
    },
    include: formInclude,
  });

  // Send push notification (fire and forget)
  sendPushToAll({
    title: `טופס חדש: ${title}`,
    body: deadline ? `דדליין: ${deadline}` : "טופס חדש להגשה",
    url: "/forms",
    tag: `form-${form.id}`,
  }, userId).catch(() => {});

  return NextResponse.json(form);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { formId } = await request.json();

  if (!formId) {
    return NextResponse.json({ error: "חסר מזהה טופס" }, { status: 400 });
  }

  // Check if form is recurring
  const form = await prisma.formLink.findUnique({ where: { id: formId } });
  if (!form) return NextResponse.json({ error: "טופס לא נמצא" }, { status: 404 });

  const today = new Date();
  const dateStr = form.recurring
    ? `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`
    : null;

  // Toggle: if already submitted, remove; if not, add
  const existing = await prisma.formSubmission.findFirst({
    where: { formId, userId, date: dateStr },
  });

  if (existing) {
    await prisma.formSubmission.delete({ where: { id: existing.id } });
    return NextResponse.json({ submitted: false });
  }

  await prisma.formSubmission.create({
    data: { formId, userId, date: dateStr },
  });

  return NextResponse.json({ submitted: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const form = await prisma.formLink.findUnique({ where: { id } });
  if (!form || (form.authorId !== userId && user?.role !== "admin")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.formLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
