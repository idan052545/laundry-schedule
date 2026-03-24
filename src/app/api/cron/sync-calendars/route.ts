import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const results: Record<string, unknown> = {};

  // Sync platoon calendar
  try {
    const res = await fetch(`${baseUrl}/api/schedule/sync?secret=${secret}`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();
    results.platoon = data;

    // Auto-notify platoon if there are changes
    if (data.todayDiff && !data.todayDiff.unchanged) {
      try {
        const lines: string[] = [];
        if (data.todayDiff.updated?.length > 0) { lines.push("עודכן:"); data.todayDiff.updated.forEach((item: string) => lines.push(`  ✏️ ${item}`)); }
        if (data.todayDiff.added?.length > 0) { lines.push("נוסף:"); data.todayDiff.added.forEach((item: string) => lines.push(`  ➕ ${item}`)); }
        if (data.todayDiff.removed?.length > 0) { lines.push("הוסר:"); data.todayDiff.removed.forEach((item: string) => lines.push(`  ➖ ${item}`)); }
        if (lines.length > 0) {
          const { sendPushToAll } = await import("@/lib/push");
          await sendPushToAll({
            title: 'עדכון לו"ז פלוגה',
            body: lines.join("\n"),
            url: "/schedule-daily",
          });
          results.platoonNotified = true;
        }
      } catch (err) {
        results.platoonNotifyError = String(err);
      }
    }
  } catch (err) {
    results.platoon = { error: String(err) };
  }

  // Sync team calendars
  for (const team of [14, 16, 17]) {
    try {
      const res = await fetch(`${baseUrl}/api/schedule/sync-team?secret=${secret}&team=${team}`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      results[`team${team}`] = data;

      // Auto-notify team if there are changes
      if (data.todayDiff && !data.todayDiff.unchanged) {
        try {
          const lines: string[] = [];
          if (data.todayDiff.updated?.length > 0) { lines.push("עודכן:"); data.todayDiff.updated.forEach((item: string) => lines.push(`  ✏️ ${item}`)); }
          if (data.todayDiff.added?.length > 0) { lines.push("נוסף:"); data.todayDiff.added.forEach((item: string) => lines.push(`  ➕ ${item}`)); }
          if (data.todayDiff.removed?.length > 0) { lines.push("הוסר:"); data.todayDiff.removed.forEach((item: string) => lines.push(`  ➖ ${item}`)); }
          if (lines.length > 0) {
            const prisma = (await import("@/lib/prisma")).default;
            const { sendPushToUsers } = await import("@/lib/push");
            const teamUsers = await prisma.user.findMany({
              where: { team },
              select: { id: true },
            });
            if (teamUsers.length > 0) {
              await sendPushToUsers(teamUsers.map((u: { id: string }) => u.id), {
                title: `עדכון לו"ז צוות ${team}`,
                body: lines.join("\n"),
                url: "/schedule-daily",
              });
            }
            results[`team${team}Notified`] = true;
          }
        } catch (err) {
          results[`team${team}NotifyError`] = String(err);
        }
      }
    } catch (err) {
      results[`team${team}`] = { error: String(err) };
    }
  }

  return NextResponse.json({ success: true, results });
}
