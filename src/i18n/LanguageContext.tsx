"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import he from "./he";
import en from "./en";
import type { Dictionary } from "./he";

export type Locale = "he" | "en";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  dir: "rtl" | "ltr";
  isHe: boolean;
  isEn: boolean;
  dateLocale: string;
}

const dictionaries: Record<Locale, Dictionary> = { he, en };

const LanguageContext = createContext<LanguageContextValue>({
  locale: "he",
  setLocale: () => {},
  t: he,
  dir: "rtl",
  isHe: true,
  isEn: false,
  dateLocale: "he-IL",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<Locale>("he");

  // Initialize from session or localStorage
  useEffect(() => {
    const sessionLang = (session?.user as { language?: string } | undefined)?.language;
    if (sessionLang === "en" || sessionLang === "he") {
      setLocaleState(sessionLang);
      localStorage.setItem("language", sessionLang);
    } else {
      const stored = localStorage.getItem("language") as Locale | null;
      if (stored === "en" || stored === "he") {
        setLocaleState(stored);
      }
    }
  }, [session]);

  // Update HTML dir and lang attributes
  useEffect(() => {
    document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("language", newLocale);
    document.documentElement.dir = newLocale === "he" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale;

    // Persist to DB if authenticated
    if (status === "authenticated") {
      try {
        await fetch("/api/user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: newLocale }),
        });
      } catch {
        // Silently fail — localStorage is the fallback
      }
    }
  }, [status]);

  const t = dictionaries[locale];
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{
      locale, setLocale, t, dir,
      isHe: locale === "he",
      isEn: locale === "en",
      dateLocale: locale === "he" ? "he-IL" : "en-US",
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
