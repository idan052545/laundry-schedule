import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Rate Limiting (in-memory, per-user) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 requests per minute per user
const DAILY_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const DAILY_LIMIT_MAX = 300; // max 300 requests per day per user

function checkRateLimit(userId: string): { allowed: boolean; error?: string } {
  const now = Date.now();

  // Per-minute check
  const minute = rateLimitMap.get(userId);
  if (!minute || now > minute.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    minute.count++;
    if (minute.count > RATE_LIMIT_MAX) {
      return { allowed: false, error: `חריגת קצב: מקסימום ${RATE_LIMIT_MAX} בקשות בדקה. נסה שוב בעוד דקה.` };
    }
  }

  // Per-day check
  const daily = DAILY_LIMIT_MAP.get(userId);
  const dayMs = 24 * 60 * 60 * 1000;
  if (!daily || now > daily.resetAt) {
    DAILY_LIMIT_MAP.set(userId, { count: 1, resetAt: now + dayMs });
  } else {
    daily.count++;
    if (daily.count > DAILY_LIMIT_MAX) {
      return { allowed: false, error: `חריגת מכסה יומית: מקסימום ${DAILY_LIMIT_MAX} בקשות ביום.` };
    }
  }

  return { allowed: true };
}

// POST - Send message to Gemini and get response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  // Rate limit check
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.error }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });

  const body = await req.json();
  const { systemPrompt, history, message, mode } = body;

  // Safety: limit history length to prevent huge token usage
  const maxHistory = mode === "chat" ? 50 : 100; // 50 turns for chat, 100 for feedback/score
  const trimmedHistory = history?.slice(-maxHistory) || [];

  // Build Gemini API request
  const contents = [];

  for (const msg of trimmedHistory) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  if (message) {
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents,
          generationConfig: {
            temperature: mode === "score" ? 0.1 : mode === "feedback" ? 0.5 : 0.8,
            maxOutputTokens: mode === "score" ? 100 : mode === "skills" ? 2000 : mode === "feedback" ? 4000 : 1000,
            thinkingConfig: { thinkingBudget: 0 }, // Disable thinking to save tokens and cost
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      try {
        const errorData = JSON.parse(error).error || {};
        if (errorData.code === 429) {
          return NextResponse.json({ error: "חריגת מכסה ב-Gemini API. יש להפעיל חיוב או להחליף מפתח.", details: "QUOTA_EXCEEDED" }, { status: 429 });
        }
        return NextResponse.json({ error: `שגיאת AI: ${errorData.message || "שגיאה לא ידועה"}` }, { status: 502 });
      } catch {
        return NextResponse.json({ error: "שגיאת AI לא ידועה" }, { status: 502 });
      }
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
