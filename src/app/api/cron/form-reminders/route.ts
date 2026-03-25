import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export async function GET(request: Request) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { searchParams } = new URL(request.url);
  const secret = bearerToken || searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
  const nowTime = `${today.getHours().toString().padStart(2, "0")}:${today.getMinutes().toString().padStart(2, "0")}`;

  // Find recurring forms with a reminderTime that matches current hour
  const forms = await prisma.formLink.findMany({
    where: {
      recurring: true,
      reminderTime: { not: null },
    },
  });

  // Filter forms whose reminder time is within the current hour window
  const formsToRemind = forms.filter((f) => {
    if (!f.reminderTime) return false;
    // Match if reminder time hour matches current hour (allows ~1h window for cron)
    const reminderHour = parseInt(f.reminderTime.split(":")[0]);
    const currentHour = today.getHours();
    return reminderHour === currentHour;
  });

  let totalSent = 0;

  for (const form of formsToRemind) {
    // Get today's submissions
    const submissions = await prisma.formSubmission.findMany({
      where: { formId: form.id, date: todayStr },
      select: { userId: true },
    });
    const submittedIds = new Set(submissions.map((s) => s.userId));

    // Get all users who haven't submitted today
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    const notSubmittedIds = allUsers
      .map((u) => u.id)
      .filter((id) => !submittedIds.has(id));

    if (notSubmittedIds.length > 0) {
      await sendPushToUsers(notSubmittedIds, {
        title: `תזכורת: ${form.title}`,
        body: "לא שכחת למלא? הירשם עד 21:00",
        url: "/forms",
        tag: `form-cron-${form.id}-${todayStr}`,
      }).catch(() => {});
      totalSent += notSubmittedIds.length;
    }
  }

  return NextResponse.json({
    ok: true,
    time: nowTime,
    formsChecked: formsToRemind.length,
    totalSent,
  });
}
