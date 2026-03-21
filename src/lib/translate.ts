import prisma from "./prisma";
import crypto from "crypto";

const GOOGLE_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

function hashText(text: string, targetLang: string): string {
  return crypto.createHash("sha256").update(`${targetLang}:${text}`).digest("hex");
}

/**
 * Server-side translation with DB caching.
 * Used by push notifications to translate content for English users.
 */
export async function translateTexts(texts: string[], targetLang = "en"): Promise<string[]> {
  if (!texts.length || !GOOGLE_API_KEY) return texts;

  const hashes = texts.map(t => hashText(t, targetLang));
  const cached = await prisma.translationCache.findMany({
    where: { sourceHash: { in: hashes } },
  });
  const cacheMap = new Map(cached.map(c => [c.sourceHash, c.translated]));

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

  if (uncached.length > 0) {
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
        for (const u of uncached) results[u.index] = u.text;
      }
    } catch {
      for (const u of uncached) results[u.index] = u.text;
    }
  }

  return results;
}
