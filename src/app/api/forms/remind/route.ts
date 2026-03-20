import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { formId } = await request.json();

  if (!formId) {
    return NextResponse.json({ error: "חסר מזהה טופס" }, { status: 400 });
  }

  const form = await prisma.formLink.findUnique({
    where: { id: formId },
  });

  if (!form) {
    return NextResponse.json({ error: "טופס לא נמצא" }, { status: 404 });
  }

  // Only the creator can send reminders
  if (form.authorId !== userId) {
    return NextResponse.json({ error: "רק יוצר הטופס יכול לשלוח תזכורת" }, { status: 403 });
  }

  // For recurring forms, only check today's submissions
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

  const submissions = await prisma.formSubmission.findMany({
    where: {
      formId,
      ...(form.recurring ? { date: todayStr } : {}),
    },
    select: { userId: true },
  });

  // Get all users who haven't submitted (exclude simulator users)
  const EXCLUDED_ROLES = ["sagal", "simulator", "simulator-admin"];
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: EXCLUDED_ROLES } },
    select: { id: true },
  });
  const submittedIds = new Set(submissions.map((s) => s.userId));
  const notSubmittedIds = allUsers
    .map((u) => u.id)
    .filter((id) => !submittedIds.has(id));

  if (notSubmittedIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "כולם כבר הגישו!" });
  }

  const result = await sendPushToUsers(notSubmittedIds, {
    title: `תזכורת: ${form.title}`,
    body: form.deadline ? `דדליין: ${form.deadline}` : "טופס ממתין להגשה",
    url: "/forms",
    tag: `form-remind-${form.id}`,
  });

  return NextResponse.json({ sent: notSubmittedIds.length, ...result });
}
