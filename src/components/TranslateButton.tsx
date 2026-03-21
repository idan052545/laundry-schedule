"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MdTranslate } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface TranslateButtonProps {
  texts: string[];
  onTranslated: (translated: string[]) => void;
  className?: string;
  size?: "sm" | "md";
}

// In-memory cache to avoid refetching within the same session
const sessionCache = new Map<string, string>();

export default function TranslateButton({ texts, onTranslated, className, size = "sm" }: TranslateButtonProps) {
  const { locale, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Reset done state when texts change (e.g. user navigates to a different day)
  const textsKey = texts.join("\0");
  useEffect(() => { setDone(false); }, [textsKey]);

  // Only show for English mode (translating Hebrew content to English)
  if (locale === "he") return null;

  const handleTranslate = useCallback(async () => {
    if (loading || done) return;

    // Check session cache first
    const results: string[] = [];
    const uncached: { index: number; text: string }[] = [];
    for (let i = 0; i < texts.length; i++) {
      const key = `en:${texts[i]}`;
      if (sessionCache.has(key)) {
        results[i] = sessionCache.get(key)!;
      } else {
        uncached.push({ index: i, text: texts[i] });
        results[i] = texts[i]; // placeholder
      }
    }

    if (uncached.length === 0) {
      onTranslated(results);
      setDone(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: uncached.map(u => u.text), targetLang: "en" }),
      });
      if (res.ok) {
        const data = await res.json();
        const translations = data.translations as string[];
        for (let i = 0; i < uncached.length; i++) {
          const translated = translations[i] || uncached[i].text;
          results[uncached[i].index] = translated;
          sessionCache.set(`en:${uncached[i].text}`, translated);
        }
        onTranslated(results);
        setDone(true);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [texts, onTranslated, loading, done]);

  const sizeClasses = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-0.5"
    : "text-xs px-2 py-1 gap-1";

  return (
    <button
      onClick={handleTranslate}
      disabled={loading || done}
      className={`inline-flex items-center ${sizeClasses} rounded-full font-medium transition shrink-0 ${
        done
          ? "bg-green-100 text-green-600 cursor-default"
          : loading
          ? "bg-blue-50 text-blue-400 cursor-wait"
          : "bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
      } ${className || ""}`}
    >
      <MdTranslate className={size === "sm" ? "text-xs" : "text-sm"} />
      {loading ? t.common.translating : done ? "✓" : t.common.translate}
    </button>
  );
}

// Hook for batch translation of a day's schedule
export function useTranslation() {
  const { locale } = useLanguage();
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const translateTexts = useCallback(async (texts: string[]) => {
    if (locale === "he" || texts.length === 0) return;

    // Filter out already translated or in-flight
    const needed = texts.filter(t =>
      !sessionCache.has(`en:${t}`) && !pendingRef.current.has(t)
    );

    if (needed.length === 0) {
      // All cached — update state from session cache (only if new entries)
      setTranslations(prev => {
        let changed = false;
        const newMap = new Map(prev);
        for (const text of texts) {
          const cached = sessionCache.get(`en:${text}`);
          if (cached && !prev.has(text)) {
            newMap.set(text, cached);
            changed = true;
          }
        }
        return changed ? newMap : prev;
      });
      return;
    }

    // Mark as pending to prevent duplicate requests
    for (const t of needed) pendingRef.current.add(t);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: needed, targetLang: "en" }),
      });
      if (res.ok) {
        const data = await res.json();
        for (let i = 0; i < needed.length; i++) {
          const translated = data.translations[i] || needed[i];
          sessionCache.set(`en:${needed[i]}`, translated);
        }
        // Update state in one batch
        setTranslations(prev => {
          const newMap = new Map(prev);
          for (const text of texts) {
            const cached = sessionCache.get(`en:${text}`);
            if (cached) newMap.set(text, cached);
          }
          return newMap;
        });
      }
    } catch {
      // Silently fail
    } finally {
      for (const t of needed) pendingRef.current.delete(t);
    }
  }, [locale]); // stable — no dependency on translations

  const getTranslation = useCallback((text: string) => {
    if (locale === "he") return text;
    return translations.get(text) || sessionCache.get(`en:${text}`) || text;
  }, [locale, translations]);

  return { translateTexts, getTranslation, isEnglish: locale === "en" };
}
