import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const results = await sendPushToUsers([userId], {
    title: "בדיקת התראות - פלוגת דותן",
    body: "אם אתה רואה את זה, ההתראות עובדות! 🎉",
    url: "/dashboard",
    tag: "test-notification",
  });

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ succeeded, failed, total: results.length });
}
