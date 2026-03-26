import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const TEAM_CALENDARS: Record<number, string> = {
  14: "30f097925245f0a2a0835cb2309c9370975d62eda1ca54faea63435892dd36b2@group.calendar.google.com",
  15: "a21643c5718503b6784ffc58a2fc7b4d9964ab7a7ae97de00b76a81945251e42@group.calendar.google.com",
  16: "8531cf33e94556ea6180bbd1231262fcc7199e35ca56bbc198545f30439c245e@group.calendar.google.com",
  17: "94e55e159f2b5e6361f3cc23bd69cb4db0bf5fe2e00ee9d8bef5c9c5d5327caf@group.calendar.google.com",
};

/**
 * Get Google OAuth2 access token from service account credentials.
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY env var (JSON string).
 */
async function getAccessToken(): Promise<string> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");

  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);

  // Build JWT
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(key.private_key, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  // Exchange JWT for access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * POST — Add a new event to the team's Google Calendar.
 * NEVER deletes or modifies existing events — only creates new ones.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { team, title, description, startTime, endTime, allDay } = body;

  if (!team || !title || !startTime || !endTime) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  // Verify ממ״ש or admin
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  const mamashRole = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  if (!isAdmin && !mamashRole) {
    return NextResponse.json({ error: "אין הרשאה — רק ממ״ש פעיל או מפקד" }, { status: 403 });
  }

  const calendarId = TEAM_CALENDARS[team as number];
  if (!calendarId) return NextResponse.json({ error: "צוות לא מוכר" }, { status: 400 });

  // Check if service account is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json({
      error: "כתיבה ליומן Google לא מוגדרת. יש להגדיר GOOGLE_SERVICE_ACCOUNT_KEY.",
      needsSetup: true,
    }, { status: 501 });
  }

  try {
    const accessToken = await getAccessToken();

    // Build Google Calendar event — ONLY INSERT, never update/delete
    const calendarEvent: Record<string, unknown> = {
      summary: title,
      description: description || undefined,
    };

    if (allDay) {
      // All-day event: use date format YYYY-MM-DD
      calendarEvent.start = { date: startTime.split("T")[0] };
      calendarEvent.end = { date: endTime.split("T")[0] };
    } else {
      calendarEvent.start = { dateTime: startTime, timeZone: "Asia/Jerusalem" };
      calendarEvent.end = { dateTime: endTime, timeZone: "Asia/Jerusalem" };
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEvent),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[calendar-write] Google API error:", res.status, text);
      return NextResponse.json({ error: `Google API: ${res.status} — ${text.slice(0, 200)}` }, { status: 502 });
    }

    const created = await res.json();

    return NextResponse.json({
      ok: true,
      googleEventId: created.id,
      htmlLink: created.htmlLink,
    });
  } catch (err) {
    console.error("[calendar-write] Error:", err);
    return NextResponse.json({
      error: `שגיאה: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
}

/**
 * PUT — Update an existing Google Calendar event (by Google event ID).
 * Only updates title/description/time — never deletes the event.
 */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { team, googleEventId, title, description, startTime, endTime } = body;

  if (!team || !googleEventId) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }

  // Verify ממ״ש or admin
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const isAdmin = user?.role === "admin" || user?.role === "commander" || user?.email === "ohad@dotan.com";
  const mamashRole = await prisma.mamashRole.findFirst({ where: { userId, team, active: true } });
  if (!isAdmin && !mamashRole) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const calendarId = TEAM_CALENDARS[team as number];
  if (!calendarId) return NextResponse.json({ error: "צוות לא מוכר" }, { status: 400 });

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json({ error: "כתיבה ליומן לא מוגדרת", needsSetup: true }, { status: 501 });
  }

  try {
    const accessToken = await getAccessToken();

    // PATCH — only update provided fields, never delete the event
    const patch: Record<string, unknown> = {};
    if (title) patch.summary = title;
    if (description !== undefined) patch.description = description;
    if (startTime) patch.start = { dateTime: startTime, timeZone: "Asia/Jerusalem" };
    if (endTime) patch.end = { dateTime: endTime, timeZone: "Asia/Jerusalem" };

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Google API: ${res.status} — ${text.slice(0, 200)}` }, { status: 502 });
    }

    const updated = await res.json();
    return NextResponse.json({ ok: true, googleEventId: updated.id });
  } catch (err) {
    return NextResponse.json({
      error: `שגיאה: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
}
