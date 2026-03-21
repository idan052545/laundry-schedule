"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdFormatQuote, MdSend, MdAutoAwesome, MdHistory,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import TranslateButton from "@/components/TranslateButton";
import { useLanguage } from "@/i18n";

interface Quote {
  id: string;
  text: string;
  date: string;
  user: { name: string; team: number | null };
}

export default function DailyQuotePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, dateLocale } = useLanguage();
  const [todayQuote, setTodayQuote] = useState<Quote | null>(null);
  const [yesterdayQuote, setYesterdayQuote] = useState<Quote | null>(null);
  const [isDana, setIsDana] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState(0);
  const [translatedToday, setTranslatedToday] = useState<string | null>(null);
  const [translatedYesterday, setTranslatedYesterday] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/daily-quote");
    if (res.ok) {
      const data = await res.json();
      setTodayQuote(data.todayQuote);
      setYesterdayQuote(data.yesterdayQuote);
      setIsDana(data.isDana);
      if (data.todayQuote) setText(data.todayQuote.text);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, router, fetchData]);

  // Staggered reveal
  useEffect(() => {
    if (!loading) {
      const timers = [
        setTimeout(() => setPhase(1), 100),
        setTimeout(() => setPhase(2), 500),
        setTimeout(() => setPhase(3), 900),
        setTimeout(() => setPhase(4), 1300),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [loading]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/daily-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    if (res.ok) {
      const quote = await res.json();
      setTodayQuote(quote);
    }
    setSubmitting(false);
  };

  if (status === "loading" || loading) return <InlineLoading />;

  const todayDate = new Date().toLocaleDateString(dateLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-xl mx-auto pb-16 -mx-4 sm:mx-auto">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.06; transform: scale(1); }
          50% { opacity: 0.12; transform: scale(1.1); }
        }
        @keyframes quoteReveal {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          60% { transform: scale(1.02) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .animate-quoteReveal { animation: quoteReveal 1s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {/* Hero header */}
      <div className={`relative overflow-hidden rounded-none sm:rounded-3xl mb-6 transition-all duration-1000 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 min-h-[220px] sm:min-h-[260px] p-6 sm:p-10 text-center relative overflow-hidden">
          {/* Background orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-breathe" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-breathe" style={{ animationDelay: "2s" }} />

          {/* Stars */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
                style={{
                  top: `${10 + (i * 7) % 80}%`,
                  left: `${5 + (i * 13) % 90}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${2.5 + (i % 3)}s`,
                }} />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center min-h-[180px]">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 shadow-xl">
              <MdAutoAwesome className="text-amber-300 text-3xl" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight" style={{
              background: "linear-gradient(90deg, #fff, #c4b5fd, #fff, #fbbf24, #fff)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 5s linear infinite",
            }}>
              {t.dailyQuote.title}
            </h1>

            <p className="text-white/50 text-sm font-medium">{todayDate}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-0 space-y-6">
        {/* Today's quote */}
        <div className={`transition-all duration-800 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {todayQuote ? (
            <div className="animate-quoteReveal">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
                {/* Accent bar */}
                <div className="h-1.5 bg-gradient-to-l from-purple-500 via-amber-400 to-indigo-500" />

                <div className="p-6 sm:p-8">
                  {/* Quote icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                      <MdFormatQuote className="text-purple-500 text-2xl rotate-180" />
                    </div>
                  </div>

                  {/* Quote text */}
                  <p className="text-center text-xl sm:text-2xl font-bold text-gray-800 leading-[1.8] mb-4">
                    {translatedToday || todayQuote.text}
                  </p>
                  <div className="flex justify-center mb-4">
                    <TranslateButton
                      size="md"
                      texts={[todayQuote.text]}
                      onTranslated={([translated]) => setTranslatedToday(translated)}
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-px bg-gradient-to-l from-purple-300 to-transparent" />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />
                    <div className="w-12 h-px bg-gradient-to-r from-purple-300 to-transparent" />
                  </div>

                  {/* Author */}
                  <div className="text-center">
                    <span className="text-sm font-bold text-purple-700">{todayQuote.user.name}</span>
                    {todayQuote.user.team && (
                      <span className="text-xs text-purple-400 me-2"> | {t.common.team} {todayQuote.user.team}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <MdFormatQuote className="text-gray-300 text-3xl rotate-180" />
              </div>
              <p className="text-gray-400 text-sm font-medium">{t.dailyQuote.noQuoteYet}</p>
              <p className="text-gray-300 text-xs mt-1">{t.dailyQuote.quoteSelectedBy}</p>
            </div>
          )}
        </div>

        {/* Dana's input form */}
        {isDana && (
          <div className={`transition-all duration-800 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100 shadow-sm">
              <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
                <MdAutoAwesome className="text-amber-500" />
                {todayQuote ? t.dailyQuote.updateQuote : t.dailyQuote.chooseQuote}
              </h3>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.dailyQuote.placeholder}
                className="w-full border border-purple-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-300 outline-none resize-none bg-white min-h-[100px] text-gray-800 placeholder-gray-400"
                dir="rtl"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-purple-400">{text.length} {t.dailyQuote.characters}</span>
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-l from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MdSend className="text-base" />
                  {submitting ? t.common.sending : todayQuote ? t.common.update : t.common.publish}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Yesterday's quote */}
        {yesterdayQuote && (
          <div className={`transition-all duration-800 ${phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <MdHistory className="text-gray-400 text-lg" />
                <span className="text-xs font-bold text-gray-400 tracking-wide">{t.dailyQuote.yesterdayQuote}</span>
              </div>
              <p className="text-gray-500 text-sm leading-[1.8] text-center italic">
                &ldquo;{translatedYesterday || yesterdayQuote.text}&rdquo;
              </p>
              <div className="flex justify-center mt-2">
                <TranslateButton
                  size="sm"
                  texts={[yesterdayQuote.text]}
                  onTranslated={([translated]) => setTranslatedYesterday(translated)}
                />
              </div>
              <div className="text-center mt-3">
                <span className="text-xs text-gray-400 font-medium">{yesterdayQuote.user.name}</span>
                {yesterdayQuote.user.team && (
                  <span className="text-[11px] text-gray-300 me-1"> | {t.common.team} {yesterdayQuote.user.team}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
