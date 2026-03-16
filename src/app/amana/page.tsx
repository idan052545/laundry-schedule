"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MdFavorite, MdHandshake, MdSelfImprovement, MdGroups,
  MdEmojiPeople, MdStars, MdForum, MdLock,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";

interface UserInfo {
  team: number | null;
}

const VALUES = [
  {
    icon: MdHandshake,
    title: "רעות ואמון",
    text: "אנו פועלים כגוף אחד ומגבים זה את זה. אנו יוצרים סביבה בטוחה שבה אמון הדדי, חברות ותמיכה הם היסוד לכל עשייה שלנו.",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconColor: "text-emerald-500",
  },
  {
    icon: MdSelfImprovement,
    title: "ענווה",
    text: 'אנו שמים את האגו בצד. אנו פתוחים תמיד ללמוד מכל אדם, מקבלים משוב באהבה וזוכרים שההצלחה של הצוות קודמת להצלחה האישית.',
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    iconColor: "text-sky-500",
  },
  {
    icon: MdGroups,
    title: "אחריות משותפת",
    text: 'אנו שותפים מלאים לדרך – מצליחים ביחד ולומדים מאתגרים ביחד. אין אצלנו "זה לא התפקיד שלי"; ההצלחה של כל פרט היא הצלחת הצוות כולו.',
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    iconColor: "text-violet-500",
  },
  {
    icon: MdEmojiPeople,
    title: "דוגמה אישית",
    text: "אנו מנהיגים דרך עשייה. כל אחד מאיתנו מתחייב לדרוש מעצמו את המקסימום, להוות מודל לחיקוי עבור חבריו ולעמוד בסטנדרטים הגבוהים ביותר.",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
  },
  {
    icon: MdStars,
    title: "חתירה למצוינות",
    text: 'אנו לא מתפשרים על הקיים ולא מסתפקים ב"מספיק טוב". אנו שואפים תמיד להשתפר, ליזום, לפרוץ גבולות ולהגיע לתוצאות הטובות ביותר.',
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    iconColor: "text-rose-500",
  },
  {
    icon: MdForum,
    title: "כבוד ושיח פתוח",
    text: "אנו מקדמים תקשורת כנה, שקופה ומכבדת. לכל קול בצוות יש מקום, ואנו מתחייבים לפתור מחלוקות מתוך הקשבה אמיתית והערכה הדדית.",
    gradient: "from-cyan-500 to-teal-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    iconColor: "text-cyan-500",
  },
];

export default function AmanaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/users-wall");
    if (res.ok) {
      const users = await res.json();
      const userId = (session?.user as { id?: string })?.id;
      const me = users.find((u: { id: string }) => u.id === userId);
      setUserInfo(me ? { team: me.team } : null);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchUser();
  }, [status, router, fetchUser]);

  // Staggered card animations
  useEffect(() => {
    if (!loading && userInfo?.team === 16) {
      VALUES.forEach((_, i) => {
        setTimeout(() => setVisibleCards(prev => [...prev, i]), 200 + i * 150);
      });
    }
  }, [loading, userInfo]);

  if (status === "loading" || loading) return <InlineLoading />;

  // Access control — team 16 only
  if (!userInfo || userInfo.team !== 16) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <MdLock className="text-6xl text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-600 mb-2">דף זה מוגבל לצוות 16</h2>
        <p className="text-gray-400 text-sm">האמנה הצוותית זמינה רק לחברי צוות 16.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-3xl mb-6 shadow-xl">
        {/* Gradient overlay background */}
        <div className="bg-gradient-to-br from-dotan-green-dark via-emerald-800 to-teal-900 p-6 sm:p-8 text-center relative">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-dotan-gold/10 rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-white/3 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            {/* Team badge */}
            <div className="inline-flex items-center gap-2 bg-dotan-gold/20 backdrop-blur-sm border border-dotan-gold/30 rounded-full px-4 py-1.5 mb-4">
              <MdFavorite className="text-dotan-gold text-sm animate-pulse" />
              <span className="text-dotan-gold font-bold text-xs tracking-wider">צוות 16</span>
              <MdFavorite className="text-dotan-gold text-sm animate-pulse" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
              אמנת צוות 16
            </h1>

            {/* Quote */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 mb-4 border border-white/10 max-w-md mx-auto">
              <p className="text-white/90 text-sm sm:text-base font-medium italic leading-relaxed">
                &ldquo;מי שליבו בדרך אינו מפחד מהמרחק&rdquo;
              </p>
            </div>

            {/* Commander */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dotan-gold to-amber-500 flex items-center justify-center text-dotan-green-dark font-black text-xs shadow-lg">
                נ
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-sm">נטע וקנין</div>
                <div className="text-white/60 text-[10px]">מפקדת צוות 16</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Intro text */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-4 shadow-sm">
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-center">
          אנו, חברי <span className="font-bold text-dotan-green-dark">צוות 16</span>, מתחייבים לפעול לאור הערכים הבאים.
          ערכים אלו יהוו את <span className="text-dotan-green font-bold">המצפן</span> שלנו בכל משימה, החלטה ואתגר שניצב בפנינו:
        </p>
      </div>

      {/* Values cards */}
      <div className="space-y-3">
        {VALUES.map((value, i) => {
          const Icon = value.icon;
          const isVisible = visibleCards.includes(i);
          return (
            <div
              key={i}
              className={`transition-all duration-700 ease-out ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div className={`${value.bg} border ${value.border} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                {/* Card header with gradient strip */}
                <div className={`bg-gradient-to-l ${value.gradient} px-4 py-2.5 flex items-center gap-2.5`}>
                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="text-white text-lg" />
                  </div>
                  <h3 className="text-white font-black text-base sm:text-lg">{value.title}</h3>
                </div>
                {/* Card body */}
                <div className="px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed">
                    {value.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Closing section */}
      <div className="mt-6">
        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          <div className="bg-gradient-to-l from-dotan-green-dark to-emerald-800 px-5 py-6 sm:px-8 sm:py-8 text-center relative">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-dotan-gold/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </div>
            <div className="relative z-10">
              <MdFavorite className="text-3xl text-dotan-gold mx-auto mb-3" />
              <p className="text-white text-base sm:text-lg font-bold leading-relaxed">
                יחד, כצוות 16, נוביל, נצליח ונישאר מאוחדים.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {[...Array(3)].map((_, i) => (
                  <MdFavorite key={i} className="text-dotan-gold/60 text-xs" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature line */}
      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] text-gray-400">
          <div className="w-8 h-px bg-gray-200" />
          אמנת צוות 16 — פלוגת דותן
          <div className="w-8 h-px bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
