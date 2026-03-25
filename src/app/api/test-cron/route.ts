import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

// Temporary test route — tests cron sync + notification to עידן חן סימנטוב only
// Call: /api/test-cron?secret=test-idan-2025
// DELETE THIS ROUTE AFTER TESTING
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "test-idan-2025") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const TEST_USER_ID = "3b361044-2aa8-46a1-b4ae-1347cb4f8000"; // עידן חן סימנטוב
  const results: Record<string, unknown> = {};
  const cronSecret = process.env.CRON_SECRET;

  const baseUrl = process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== "http://localhost:3000"
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  // 1. Platoon sync (using cron secret, same as real cron)
  try {
    const res = await fetch(`${baseUrl}/api/schedule/sync?secret=${cronSecret}`, {
      method: "POST",
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
    const res = await fetch(`${baseUrl}/api/schedule/sync-team?secret=${cronSecret}&team=16`, {
      method: "POST",
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

  // 3. Check push subscriptions for test user
  const subs = await prisma.pushSubscription.count({ where: { userId: TEST_USER_ID } });
  results.testUserSubscriptions = subs;

  return NextResponse.json({
    success: true,
    testUser: "עידן חן סימנטוב",
    note: "Notifications sent ONLY to test user. Uses CRON_SECRET — fully server-side, no login needed.",
    results,
  });
}
