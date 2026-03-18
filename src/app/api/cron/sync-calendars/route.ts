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
    results.platoon = await res.json();
  } catch (err) {
    results.platoon = { error: String(err) };
  }

  // Sync team 16 calendar
  try {
    const res = await fetch(`${baseUrl}/api/schedule/sync-team?secret=${secret}`, {
      method: "POST",
      cache: "no-store",
    });
    results.team16 = await res.json();
  } catch (err) {
    results.team16 = { error: String(err) };
  }

  return NextResponse.json({ success: true, results });
}
