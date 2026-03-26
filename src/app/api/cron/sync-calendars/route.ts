import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  try {
    // Vercel cron sends Authorization: Bearer <CRON_SECRET>
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const { searchParams } = new URL(request.url);
    const secret = bearerToken || searchParams.get("secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use production URL to avoid Vercel Deployment Protection on preview URLs
    const prodDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL; // e.g. "laundry-schedule.vercel.app"
    const baseUrl = prodDomain
      ? `https://${prodDomain}`
      : process.env.NEXTAUTH_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;

    const results: Record<string, unknown> = {};
    console.log(`[cron] baseUrl=${baseUrl}, secretLen=${secret?.length}`);

    // Helper: fetch with timeout, error handling, and retry
    async function safeFetch(url: string, label: string): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const res = await fetch(url, {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: { "x-cron-secret": secret || "" },
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return { ok: false, error: `${label}: HTTP ${res.status} — ${text.slice(0, 200)}` };
        }
        const data = await res.json();
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: `${label}: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    // Sync platoon calendar
    const platoonResult = await safeFetch(
      `${baseUrl}/api/schedule/sync?secret=${encodeURIComponent(secret)}`,
      "platoon-sync"
    );
    if (platoonResult.ok && platoonResult.data) {
      const data = platoonResult.data;
      results.platoon = { synced: data.synced, unchanged: (data.todayDiff as Record<string, unknown>)?.unchanged };

      // Only notify if there are actual changes
      const todayDiff = data.todayDiff as { added?: string[]; removed?: string[]; updated?: string[]; unchanged?: boolean } | undefined;
      if (todayDiff && !todayDiff.unchanged) {
        const lines = formatChangeLines(todayDiff);
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
    } else {
      results.platoon = { error: platoonResult.error };
    }

    // Sync team calendars
    for (const team of [14, 15, 16, 17]) {
      const teamResult = await safeFetch(
        `${baseUrl}/api/schedule/sync-team?secret=${encodeURIComponent(secret)}&team=${team}`,
        `team-${team}-sync`
      );
      if (teamResult.ok && teamResult.data) {
        const data = teamResult.data;
        results[`team${team}`] = { synced: data.synced, assigned: data.assigned, unchanged: (data.todayDiff as Record<string, unknown>)?.unchanged };

        // Only notify team members if there are actual changes
        const todayDiff = data.todayDiff as { added?: string[]; removed?: string[]; updated?: string[]; unchanged?: boolean } | undefined;
        if (todayDiff && !todayDiff.unchanged) {
          const lines = formatChangeLines(todayDiff);
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
      } else {
        results[`team${team}`] = { error: teamResult.error };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("Cron sync-calendars fatal error:", err);
    return NextResponse.json(
      { error: `Fatal: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
