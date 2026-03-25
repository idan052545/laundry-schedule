import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function formatChangeLines(diff: { added?: string[]; removed?: string[]; updated?: string[] }): string[] {
  const lines: string[] = [];
  if (diff.updated?.length) {
    diff.updated.forEach((item: string) => lines.push(`✏️ שינוי: ${item}`));
  }
  if (diff.added?.length) {
    diff.added.forEach((item: string) => lines.push(`➕ חדש: ${item}`));
  }
  if (diff.removed?.length) {
    diff.removed.forEach((item: string) => lines.push(`➖ בוטל: ${item}`));
  }
  return lines;
}

export async function GET(request: Request) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { searchParams } = new URL(request.url);
  const secret = bearerToken || searchParams.get("secret");
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
    results.platoon = { synced: data.synced, unchanged: data.todayDiff?.unchanged };

    // Only notify if there are actual changes — don't spam on no-change syncs
    if (data.todayDiff && !data.todayDiff.unchanged) {
      const lines = formatChangeLines(data.todayDiff);
      if (lines.length > 0) {
        try {
          const { sendPushToAll } = await import("@/lib/push");
          await sendPushToAll({
            title: 'שינוי בלו"ז היום',
            body: lines.join("\n"),
            url: "/schedule-daily",
          });
          results.platoonNotified = true;
        } catch (err) {
          results.platoonNotifyError = String(err);
        }
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
      results[`team${team}`] = { synced: data.synced, assigned: data.assigned, unchanged: data.todayDiff?.unchanged };

      // Only notify team members if there are actual changes
      if (data.todayDiff && !data.todayDiff.unchanged) {
        const lines = formatChangeLines(data.todayDiff);
        if (lines.length > 0) {
          try {
            const prisma = (await import("@/lib/prisma")).default;
            const { sendPushToUsers } = await import("@/lib/push");
            const teamUsers = await prisma.user.findMany({
              where: { team },
              select: { id: true },
            });
            if (teamUsers.length > 0) {
              await sendPushToUsers(teamUsers.map((u: { id: string }) => u.id), {
                title: `שינוי בלו"ז צוות ${team}`,
                body: lines.join("\n"),
                url: "/schedule-daily",
              });
            }
            results[`team${team}Notified`] = true;
          } catch (err) {
            results[`team${team}NotifyError`] = String(err);
          }
        }
      }
    } catch (err) {
      results[`team${team}`] = { error: String(err) };
    }
  }

  return NextResponse.json({ success: true, results });
}
