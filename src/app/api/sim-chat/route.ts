import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST - Send message to Gemini and get response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });

  const body = await req.json();
  const { systemPrompt, history, message, mode } = body;
  // mode: "chat" | "feedback" | "score" | "skills"

  // Build Gemini API request
  const contents = [];

  // Add conversation history
  if (history && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  // Add current message
  if (message) {
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents,
          generationConfig: {
            temperature: mode === "score" ? 0.1 : mode === "feedback" ? 0.5 : 0.8,
            maxOutputTokens: mode === "score" ? 10 : mode === "skills" ? 500 : mode === "feedback" ? 1500 : 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      const errorData = JSON.parse(error).error || {};
      if (errorData.code === 429) {
        return NextResponse.json({ error: "חריגת מכסה ב-Gemini API. יש להפעיל חיוב או להחליף מפתח.", details: "QUOTA_EXCEEDED" }, { status: 429 });
      }
      return NextResponse.json({ error: `שגיאת AI: ${errorData.message || "שגיאה לא ידועה"}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }
}
