import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TEAM_CALENDARS, getAccessToken, createGoogleEvent, patchGoogleEvent } from "@/lib/google-calendar";

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

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json({
      error: "כתיבה ליומן Google לא מוגדרת. יש להגדיר GOOGLE_SERVICE_ACCOUNT_KEY.",
      needsSetup: true,
    }, { status: 501 });
  }

  try {
    const accessToken = await getAccessToken();
    const result = await createGoogleEvent(accessToken, calendarId, { title, description, startTime, endTime, allDay });
    return NextResponse.json({ ok: true, ...result });
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
    await patchGoogleEvent(accessToken, calendarId, googleEventId, { title, description, startTime, endTime });
    return NextResponse.json({ ok: true, googleEventId });
  } catch (err) {
    return NextResponse.json({
      error: `שגיאה: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
}
