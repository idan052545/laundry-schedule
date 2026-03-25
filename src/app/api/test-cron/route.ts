import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Temporary test route — tests cron sync + notification to עידן חן סימנטוב only
// Must be called by a logged-in admin
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (user?.role !== "admin" && user?.email !== "ohad@dotan.com") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const TEST_USER_ID = "3b361044-2aa8-46a1-b4ae-1347cb4f8000"; // עידן חן סימנטוב
  const results: Record<string, unknown> = {};

  // Forward cookies for internal fetch auth
  const cookie = req.headers.get("cookie") || "";
  const baseUrl = getBaseUrl();

  // 1. Platoon sync
  try {
    const res = await fetch(`${baseUrl}/api/schedule/sync`, {
      method: "POST",
      headers: { cookie },
      cache: "no-store",
    });
    const data = await res.json();
    results.platoonSync = { synced: data.synced, todayDiff: data.todayDiff };

    if (data.todayDiff && !data.todayDiff.unchanged) {
      const lines: string[] = [];
      if (data.todayDiff.updated?.length > 0) { lines.push("עודכן:"); data.todayDiff.updated.forEach((item: string) => lines.push(`  ✏️ ${item}`)); }
      if (data.todayDiff.added?.length > 0) { lines.push("נוסף:"); data.todayDiff.added.forEach((item: string) => lines.push(`  ➕ ${item}`)); }
      if (data.todayDiff.removed?.length > 0) { lines.push("הוסר:"); data.todayDiff.removed.forEach((item: string) => lines.push(`  ➖ ${item}`)); }
      if (lines.length > 0) {
        await sendPushToUsers([TEST_USER_ID], {
          title: '[TEST] עדכון לו"ז פלוגה',
          body: lines.join("\n"),
          url: "/schedule-daily",
        });
        results.platoonNotified = true;
      }
    } else {
      await sendPushToUsers([TEST_USER_ID], {
        title: '[TEST] סנכרון פלוגה',
        body: `סונכרנו ${data.synced || 0} אירועים. אין שינויים בלוז היום.`,
        url: "/schedule-daily",
      });
      results.platoonNotified = "sent (no changes)";
    }
  } catch (err) {
    results.platoonSync = { error: String(err) };
  }

  // 2. Team 16 sync (עידן's team)
  try {
    const res = await fetch(`${baseUrl}/api/schedule/sync-team?team=16`, {
      method: "POST",
      headers: { cookie },
      cache: "no-store",
    });
    const data = await res.json();
    results.team16Sync = { synced: data.synced, assigned: data.assigned, todayDiff: data.todayDiff };

    if (data.todayDiff && !data.todayDiff.unchanged) {
      const lines: string[] = [];
      if (data.todayDiff.updated?.length > 0) { lines.push("עודכן:"); data.todayDiff.updated.forEach((item: string) => lines.push(`  ✏️ ${item}`)); }
      if (data.todayDiff.added?.length > 0) { lines.push("נוסף:"); data.todayDiff.added.forEach((item: string) => lines.push(`  ➕ ${item}`)); }
      if (data.todayDiff.removed?.length > 0) { lines.push("הוסר:"); data.todayDiff.removed.forEach((item: string) => lines.push(`  ➖ ${item}`)); }
      if (lines.length > 0) {
        await sendPushToUsers([TEST_USER_ID], {
          title: '[TEST] עדכון לו"ז צוות 16',
          body: lines.join("\n"),
          url: "/schedule-daily",
        });
        results.team16Notified = true;
      }
    } else {
      await sendPushToUsers([TEST_USER_ID], {
        title: '[TEST] סנכרון צוות 16',
        body: `סונכרנו ${data.synced || 0} אירועים. אין שינויים בלוז היום.`,
        url: "/schedule-daily",
      });
      results.team16Notified = "sent (no changes)";
    }
  } catch (err) {
    results.team16Sync = { error: String(err) };
  }

  // 3. Check push subscription count for test user
  const subs = await prisma.pushSubscription.count({ where: { userId: TEST_USER_ID } });
  results.testUserSubscriptions = subs;

  return NextResponse.json({
    success: true,
    testUser: "עידן חן סימנטוב",
    note: "Notifications sent ONLY to test user, not to platoon/team",
    results,
  });
}

function getBaseUrl() {
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== "http://localhost:3000") {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
