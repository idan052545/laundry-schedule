/**
 * Google Calendar helpers — shared between calendar-write and calendar-sync.
 * Uses Service Account JWT auth (RS256).
 * NEVER deletes events. Only creates or patches.
 */

export const TEAM_CALENDARS: Record<number, string> = {
  14: "30f097925245f0a2a0835cb2309c9370975d62eda1ca54faea63435892dd36b2@group.calendar.google.com",
  15: "a21643c5718503b6784ffc58a2fc7b4d9964ab7a7ae97de00b76a81945251e42@group.calendar.google.com",
  16: "8531cf33e94556ea6180bbd1231262fcc7199e35ca56bbc198545f30439c245e@group.calendar.google.com",
  17: "94e55e159f2b5e6361f3cc23bd69cb4db0bf5fe2e00ee9d8bef5c9c5d5327caf@group.calendar.google.com",
};

/**
 * Get Google OAuth2 access token from service account credentials.
 */
export async function getAccessToken(): Promise<string> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");

  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);

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
 * Create a new event in Google Calendar. Returns the Google event ID.
 */
export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: { title: string; description?: string; startTime: string; endTime: string; allDay?: boolean }
): Promise<{ googleEventId: string; htmlLink: string }> {
  const calendarEvent: Record<string, unknown> = {
    summary: event.title,
    description: event.description || undefined,
  };

  if (event.allDay) {
    calendarEvent.start = { date: event.startTime.split("T")[0] };
    calendarEvent.end = { date: event.endTime.split("T")[0] };
  } else {
    calendarEvent.start = { dateTime: event.startTime, timeZone: "Asia/Jerusalem" };
    calendarEvent.end = { dateTime: event.endTime, timeZone: "Asia/Jerusalem" };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(calendarEvent),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API POST ${res.status}: ${text.slice(0, 300)}`);
  }

  const created = await res.json();
  return { googleEventId: created.id, htmlLink: created.htmlLink };
}

/**
 * Patch an existing Google Calendar event. Only updates provided fields.
 */
export async function patchGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  updates: { title?: string; description?: string; startTime?: string; endTime?: string }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title) patch.summary = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.startTime) patch.start = { dateTime: updates.startTime, timeZone: "Asia/Jerusalem" };
  if (updates.endTime) patch.end = { dateTime: updates.endTime, timeZone: "Asia/Jerusalem" };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API PATCH ${res.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Delete a Google Calendar event.
 * Removes it completely — no garbage left in the calendar.
 */
export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 410 Gone = already deleted, that's fine
  if (!res.ok && res.status !== 410) {
    const text = await res.text();
    throw new Error(`Google API DELETE ${res.status}: ${text.slice(0, 300)}`);
  }
}
