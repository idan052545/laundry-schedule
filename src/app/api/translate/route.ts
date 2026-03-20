import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const GOOGLE_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

function hashText(text: string, targetLang: string): string {
  return crypto.createHash("sha256").update(`${targetLang}:${text}`).digest("hex");
}

// POST — translate text with DB caching
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { texts, targetLang } = body as { texts: string[]; targetLang: string };

  if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLang) {
    return NextResponse.json({ error: "Missing texts or targetLang" }, { status: 400 });
  }

  if (texts.length > 50) {
    return NextResponse.json({ error: "Max 50 texts per request" }, { status: 400 });
  }

  // Check cache first
  const hashes = texts.map(t => hashText(t, targetLang));
  const cached = await prisma.translationCache.findMany({
    where: { sourceHash: { in: hashes } },
  });
  const cacheMap = new Map(cached.map(c => [c.sourceHash, c.translated]));

  // Find uncached texts
  const uncached: { index: number; text: string; hash: string }[] = [];
  const results: string[] = new Array(texts.length);

  for (let i = 0; i < texts.length; i++) {
    const h = hashes[i];
    if (cacheMap.has(h)) {
      results[i] = cacheMap.get(h)!;
    } else {
      uncached.push({ index: i, text: texts[i], hash: h });
    }
  }

  // Translate uncached via Google Translate API
  if (uncached.length > 0 && GOOGLE_API_KEY) {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: uncached.map(u => u.text),
          target: targetLang,
          source: targetLang === "en" ? "he" : "en",
          format: "text",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const translations = data.data?.translations || [];

        // Save to cache and fill results
        const cacheEntries = [];
        for (let i = 0; i < uncached.length; i++) {
          const translated = translations[i]?.translatedText || uncached[i].text;
          results[uncached[i].index] = translated;
          cacheEntries.push({
            sourceHash: uncached[i].hash,
            sourceText: uncached[i].text,
            targetLang,
            translated,
          });
        }

        // Batch insert cache entries (ignore duplicates)
        if (cacheEntries.length > 0) {
          await Promise.all(
            cacheEntries.map(entry =>
              prisma.translationCache.upsert({
                where: { sourceHash: entry.sourceHash },
                update: { translated: entry.translated },
                create: entry,
              })
            )
          );
        }
      } else {
        // API failed — return originals for uncached
        for (const u of uncached) {
          results[u.index] = u.text;
        }
      }
    } catch {
      for (const u of uncached) {
        results[u.index] = u.text;
      }
    }
  } else {
    // No API key — return originals
    for (const u of uncached) {
      results[u.index] = u.text;
    }
  }

  return NextResponse.json({ translations: results });
}
