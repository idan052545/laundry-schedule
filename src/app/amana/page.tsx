"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  MdFavorite, MdHandshake, MdSelfImprovement, MdGroups,
  MdEmojiPeople, MdStars, MdForum, MdLock, MdDownload,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";

interface UserInfo {
  team: number | null;
}

const TEAM_MEMBERS = [
  "אורי חדד", "אלה פלד", "הילה פינצי", "יהלי כוכבא",
  "יהלי לוי", "יעל שושן", "מעיין מרדכי", "נועה בלפור",
  "נועה גלמן", "נטע וילונסקי", "עדן בחרוף", "עידן חן סימנטוב",
  "עילי גולדשטיין", "רוני מאירסון", "תמר נגר",
];

const VALUES = [
  {
    icon: MdHandshake,
    title: "רעות ואמון",
    text: "אנו פועלים כגוף אחד ומגבים זה את זה. אנו יוצרים סביבה בטוחה שבה אמון הדדי, חברות ותמיכה הם היסוד לכל עשייה שלנו.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-200/50",
    accent: "#10b981",
  },
  {
    icon: MdSelfImprovement,
    title: "ענווה",
    text: "אנו שמים את האגו בצד. אנו פתוחים תמיד ללמוד מכל אדם, מקבלים משוב באהבה וזוכרים שההצלחה של הצוות קודמת להצלחה האישית.",
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-sky-200/50",
    accent: "#0ea5e9",
  },
  {
    icon: MdGroups,
    title: "אחריות משותפת",
    text: 'אנו שותפים מלאים לדרך – מצליחים ביחד ולומדים מאתגרים ביחד. אין אצלנו "זה לא התפקיד שלי"; ההצלחה של כל פרט היא הצלחת הצוות כולו.',
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-200/50",
    accent: "#8b5cf6",
  },
  {
    icon: MdEmojiPeople,
    title: "דוגמה אישית",
    text: "אנו מנהיגים דרך עשייה. כל אחד מאיתנו מתחייב לדרוש מעצמו את המקסימום, להוות מודל לחיקוי עבור חבריו ולעמוד בסטנדרטים הגבוהים ביותר.",
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-200/50",
    accent: "#f59e0b",
  },
  {
    icon: MdStars,
    title: "חתירה למצוינות",
    text: 'אנו לא מתפשרים על הקיים ולא מסתפקים ב"מספיק טוב". אנו שואפים תמיד להשתפר, ליזום, לפרוץ גבולות ולהגיע לתוצאות הטובות ביותר.',
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-200/50",
    accent: "#f43f5e",
  },
  {
    icon: MdForum,
    title: "כבוד ושיח פתוח",
    text: "אנו מקדמים תקשורת כנה, שקופה ומכבדת. לכל קול בצוות יש מקום, ואנו מתחייבים לפתור מחלוקות מתוך הקשבה אמיתית והערכה הדדית.",
    gradient: "from-cyan-500 to-teal-600",
    glow: "shadow-cyan-200/50",
    accent: "#06b6d4",
  },
];

const HEART_POSITIONS = [
  { top: "8%", right: "8%", delay: "0s", size: "text-2xl" },
  { top: "20%", left: "5%", delay: "1.5s", size: "text-xl" },
  { top: "45%", right: "4%", delay: "0.8s", size: "text-lg" },
  { top: "70%", left: "8%", delay: "2.2s", size: "text-2xl" },
  { top: "85%", right: "12%", delay: "0.4s", size: "text-sm" },
  { top: "15%", right: "30%", delay: "1.8s", size: "text-sm" },
  { top: "60%", left: "15%", delay: "1.2s", size: "text-lg" },
];

const NAME_LAYOUTS = [
  "rotate-[-3deg]", "rotate-[2deg]", "rotate-[-1deg]", "rotate-[3deg]",
  "rotate-[-2deg]", "rotate-[1deg]", "rotate-[-3deg]", "rotate-[2deg]",
  "rotate-[0deg]", "rotate-[-2deg]", "rotate-[3deg]", "rotate-[-1deg]",
  "rotate-[2deg]", "rotate-[-3deg]", "rotate-[1deg]",
];

const NAME_COLORS = [
  "from-yellow-400 to-amber-500",
  "from-green-400 to-emerald-500",
  "from-pink-400 to-rose-500",
  "from-yellow-400 to-amber-500",
  "from-green-400 to-emerald-500",
  "from-pink-400 to-rose-500",
  "from-yellow-400 to-amber-500",
  "from-green-400 to-emerald-500",
  "from-pink-400 to-rose-500",
  "from-yellow-400 to-amber-500",
  "from-green-400 to-emerald-500",
  "from-pink-400 to-rose-500",
  "from-yellow-400 to-amber-500",
  "from-green-400 to-emerald-500",
  "from-pink-400 to-rose-500",
];

export default function AmanaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!loading && userInfo?.team === 16) {
      const timers = [
        setTimeout(() => setPhase(1), 100),
        setTimeout(() => setPhase(2), 600),
        setTimeout(() => setPhase(3), 1000),
        setTimeout(() => setPhase(4), 1300),
        setTimeout(() => setPhase(5), 1600),
        setTimeout(() => setPhase(6), 1900),
        setTimeout(() => setPhase(7), 2200),
        setTimeout(() => setPhase(8), 2500),
        setTimeout(() => setPhase(9), 2900),
        setTimeout(() => setPhase(10), 3400),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [loading, userInfo]);

  const handleDownloadPDF = () => {
    // Force all phases visible for print
    const prevPhase = phase;
    setPhase(10);
    setTimeout(() => {
      window.print();
      setPhase(prevPhase);
    }, 200);
  };

  if (status === "loading" || loading) return <InlineLoading />;

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
    <div className="max-w-2xl mx-auto pb-16 -mx-4 sm:mx-auto">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.1); }
        }
        @keyframes wave {
          0% { transform: translateX(0) scaleY(1); }
          25% { transform: translateX(5px) scaleY(1.05); }
          50% { transform: translateX(0) scaleY(0.95); }
          75% { transform: translateX(-5px) scaleY(1.05); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes popIn {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          70% { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(240,192,64,0.3); }
          50% { box-shadow: 0 0 40px rgba(240,192,64,0.6); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.08; }
          50% { transform: scale(1.15); opacity: 0.15; }
        }
        @keyframes diamond-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-wave { animation: wave 4s ease-in-out infinite; }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .animate-pop { animation: popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .animate-slideUp { animation: slideUp 0.8s ease-out forwards; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        .animate-gradient { animation: gradient-shift 6s ease infinite; background-size: 200% 200%; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .animate-diamond { animation: diamond-spin 20s linear infinite; }

        @media print {
          @page { size: A4; margin: 10mm; }
          :global(nav) { display: none !important; }
          :global(body) {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .animate-pop { opacity: 1 !important; animation: none !important; transform: none !important; }
          .animate-float, .animate-wave, .animate-shimmer, .animate-glow,
          .animate-pulse-ring, .animate-breathe, .animate-diamond {
            animation: none !important;
          }
        }
      `}</style>

      {/* Download PDF button */}
      <div className={`no-print flex justify-end px-4 sm:px-0 mb-2 transition-all duration-700 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-dotan-green-dark text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <MdDownload className="text-base text-dotan-green" />
          שמור כ-PDF
        </button>
      </div>

      <div ref={contentRef} className="print-area">
        {/* HERO SECTION */}
        <div className={`relative overflow-hidden rounded-none sm:rounded-3xl mb-0 transition-all duration-1000 ${phase >= 1 ? "opacity-100" : "opacity-0"}`}>
          <div className="bg-gradient-to-br from-[#1a2e0f] via-dotan-green-dark to-[#0f2b1f] min-h-[420px] sm:min-h-[480px] p-6 sm:p-10 text-center relative overflow-hidden">
            {/* Animated geometric background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Rotating diamond grid */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] animate-diamond opacity-[0.04]">
                <svg viewBox="0 0 600 600" className="w-full h-full">
                  <rect x="200" y="200" width="200" height="200" fill="none" stroke="#f0c040" strokeWidth="1" transform="rotate(45 300 300)" />
                  <rect x="150" y="150" width="300" height="300" fill="none" stroke="#f0c040" strokeWidth="0.5" transform="rotate(45 300 300)" />
                  <rect x="100" y="100" width="400" height="400" fill="none" stroke="#4ade80" strokeWidth="0.5" transform="rotate(45 300 300)" />
                </svg>
              </div>

              {/* Green wave SVGs */}
              <svg className="absolute w-full h-full opacity-15" viewBox="0 0 400 500" preserveAspectRatio="none">
                <path d="M50,0 Q100,100 50,200 Q0,300 50,400 Q100,500 50,600" fill="none" stroke="#4ade80" strokeWidth="4" className="animate-wave" style={{ animationDelay: "0s" }} />
                <path d="M150,0 Q200,80 150,160 Q100,240 150,320 Q200,400 150,500" fill="none" stroke="#34d399" strokeWidth="3" className="animate-wave" style={{ animationDelay: "0.5s" }} />
                <path d="M280,0 Q330,120 280,240 Q230,360 280,480" fill="none" stroke="#6ee7b7" strokeWidth="3.5" className="animate-wave" style={{ animationDelay: "1s" }} />
                <path d="M350,0 Q380,90 350,180 Q320,270 350,360 Q380,450 350,540" fill="none" stroke="#4ade80" strokeWidth="2.5" className="animate-wave" style={{ animationDelay: "1.5s" }} />
              </svg>
            </div>

            {/* Floating hearts */}
            {HEART_POSITIONS.map((pos, i) => (
              <div key={i}
                className={`absolute ${pos.size} text-red-500/60 animate-float pointer-events-none`}
                style={{ top: pos.top, left: pos.left, right: pos.right, animationDelay: pos.delay }}>
                <MdFavorite />
              </div>
            ))}

            {/* Glowing orbs — more dramatic */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-dotan-gold/8 rounded-full blur-3xl animate-breathe" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl animate-breathe" style={{ animationDelay: "2s" }} />
            <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl animate-breathe" style={{ animationDelay: "3s" }} />

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[360px]">
              {/* Team badge with pulse ring */}
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-dotan-gold/30 animate-pulse-ring" />
                <div className="absolute inset-[-8px] rounded-full border-2 border-dotan-gold/20 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
                <div className="animate-glow rounded-full w-24 h-24 bg-gradient-to-br from-dotan-gold via-amber-400 to-yellow-500 flex items-center justify-center shadow-2xl relative z-10">
                  <span className="text-dotan-green-dark font-black text-4xl tracking-tight">16</span>
                </div>
              </div>

              <h1 className="text-5xl sm:text-6xl font-black text-white mb-3 tracking-tight" style={{
                background: "linear-gradient(90deg, #fff, #f0c040, #fff, #f0c040, #fff)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "shimmer 4s linear infinite",
              }}>
                אמנת צוות 16
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-px bg-gradient-to-l from-dotan-gold to-transparent" />
                <div className="w-2 h-2 rounded-full bg-dotan-gold/60" />
                <div className="w-16 h-px bg-gradient-to-r from-dotan-gold to-transparent" />
              </div>

              {/* Quote — glass card */}
              <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl px-7 py-5 mb-6 border border-white/10 max-w-md mx-auto shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-dotan-gold/5 to-transparent" />
                <p className="text-white text-lg sm:text-xl font-bold italic leading-relaxed relative z-10">
                  &ldquo;מי שליבו בדרך<br />אינו מפחד מהמרחק&rdquo;
                </p>
              </div>

              {/* Commander — premium badge */}
              <div className="flex items-center gap-3 bg-white/[0.08] backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/10 shadow-xl">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-dotan-gold to-amber-600 flex items-center justify-center text-dotan-green-dark font-black text-sm shadow-lg ring-2 ring-dotan-gold/30">
                  נ.ו
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-base">נטע וקנין</div>
                  <div className="text-dotan-gold/70 text-[11px] font-medium tracking-wide">מפקדת צוות 16</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-0">
          {/* INTRO */}
          <div className={`transition-all duration-800 mt-6 mb-6 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l from-emerald-500 via-dotan-gold to-rose-500 animate-gradient" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
              <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9] text-center relative z-10">
                אנו, חברי <span className="font-black text-dotan-green-dark">צוות 16</span>, מתחייבים לפעול לאור הערכים הבאים.
                ערכים אלו יהוו את <span className="bg-gradient-to-l from-dotan-green to-emerald-600 bg-clip-text text-transparent font-black">המצפן</span> שלנו בכל משימה, החלטה ואתגר שניצב בפנינו:
              </p>
            </div>
          </div>

          {/* VALUES */}
          <div className="space-y-5">
            {VALUES.map((value, i) => {
              const Icon = value.icon;
              const visible = phase >= i + 3;
              return (
                <div key={i} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"}`}>
                  <div className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl ${value.glow} transition-all duration-300 border border-gray-100 group hover:-translate-y-1`}>
                    {/* Gradient header with number accent */}
                    <div className={`bg-gradient-to-l ${value.gradient} p-5 sm:p-6 relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/5" />
                      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                      <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full blur-xl" />
                      {/* Large background number */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-4 text-[80px] font-black text-white/[0.07] leading-none select-none">
                        {i + 1}
                      </div>
                      <div className="relative flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Icon className="text-white text-3xl" />
                        </div>
                        <div>
                          <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight">{value.title}</h3>
                          <div className="text-white/40 text-xs font-medium mt-0.5 tracking-wide">ערך {i + 1} מתוך 6</div>
                        </div>
                      </div>
                    </div>
                    {/* Body with accent border */}
                    <div className="p-5 sm:p-6 relative">
                      <div className="absolute top-0 right-6 w-12 h-1 rounded-full" style={{ backgroundColor: value.accent, opacity: 0.3 }} />
                      <p className="text-gray-700 text-sm sm:text-[15px] leading-[2]">{value.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TEAM MEMBERS — scattered names */}
          <div className={`transition-all duration-1000 ${phase >= 9 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
            <div className="mt-10 mb-6">
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-3">
                  <div className="w-12 h-px bg-gradient-to-l from-gray-300 to-transparent" />
                  <span className="text-xs font-black text-gray-400 tracking-[0.2em] uppercase">חברי הצוות</span>
                  <div className="w-12 h-px bg-gradient-to-r from-gray-300 to-transparent" />
                </div>
              </div>
              <div className="relative bg-gradient-to-br from-[#1a2e0f] via-dotan-green-dark to-[#0f2b1f] rounded-3xl p-7 sm:p-10 overflow-hidden min-h-[300px]">
                {/* Background pattern */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <svg className="absolute w-full h-full opacity-10" viewBox="0 0 400 300" preserveAspectRatio="none">
                    <path d="M0,50 Q80,20 160,60 Q240,100 320,50 Q400,10 400,50" fill="none" stroke="#4ade80" strokeWidth="3" className="animate-wave" />
                    <path d="M0,150 Q100,120 200,160 Q300,200 400,140" fill="none" stroke="#34d399" strokeWidth="2.5" className="animate-wave" style={{ animationDelay: "1s" }} />
                    <path d="M0,250 Q100,220 200,260 Q300,280 400,240" fill="none" stroke="#6ee7b7" strokeWidth="2" className="animate-wave" style={{ animationDelay: "2s" }} />
                  </svg>
                  {/* Floating hearts */}
                  <MdFavorite className="absolute top-4 right-6 text-red-500/40 text-xl animate-float" style={{ animationDelay: "0.5s" }} />
                  <MdFavorite className="absolute bottom-6 left-8 text-red-500/40 text-lg animate-float" style={{ animationDelay: "1.5s" }} />
                  <MdFavorite className="absolute top-1/2 right-1/4 text-red-500/25 text-sm animate-float" style={{ animationDelay: "2s" }} />
                  <MdFavorite className="absolute top-1/3 left-1/5 text-red-500/20 text-base animate-float" style={{ animationDelay: "2.5s" }} />
                </div>

                {/* Scattered names */}
                <div className="relative z-10 flex flex-wrap justify-center gap-3 sm:gap-3.5">
                  {TEAM_MEMBERS.map((name, i) => (
                    <div key={i}
                      className={`${NAME_LAYOUTS[i]} animate-pop`}
                      style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}>
                      <div className={`bg-gradient-to-l ${NAME_COLORS[i]} px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-lg hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-default border border-white/10`}>
                        <span className="text-white font-black text-xs sm:text-sm drop-shadow-md whitespace-nowrap">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commander name — special */}
                <div className="relative z-10 flex justify-center mt-6">
                  <div className="bg-gradient-to-l from-dotan-gold via-amber-400 to-yellow-500 px-6 py-2.5 rounded-xl shadow-xl animate-glow border border-amber-300/30">
                    <span className="text-dotan-green-dark font-black text-sm sm:text-base tracking-wide">נטע וקנין  -  מפקדת</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CLOSING */}
          <div className={`transition-all duration-1000 ${phase >= 10 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              <div className="bg-gradient-to-br from-[#1a2e0f] via-dotan-green-dark to-emerald-900 px-6 py-10 sm:px-10 sm:py-12 text-center relative">
                {/* Decorative background */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-dotan-gold/8 rounded-full blur-3xl animate-breathe" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/8 rounded-full blur-3xl animate-breathe" style={{ animationDelay: "2s" }} />
                  {/* Diamond pattern */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] opacity-[0.03] animate-diamond">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                      <rect x="100" y="100" width="100" height="100" fill="none" stroke="#f0c040" strokeWidth="1" transform="rotate(45 150 150)" />
                      <rect x="75" y="75" width="150" height="150" fill="none" stroke="#f0c040" strokeWidth="0.5" transform="rotate(45 150 150)" />
                    </svg>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <MdFavorite className="text-red-400/70 text-lg animate-float" style={{ animationDelay: "0s" }} />
                    <div className="w-3 h-3 rounded-full bg-dotan-gold/50 animate-float" style={{ animationDelay: "0.15s" }} />
                    <MdFavorite className="text-dotan-gold/80 text-2xl animate-float" style={{ animationDelay: "0.3s" }} />
                    <div className="w-3 h-3 rounded-full bg-dotan-gold/50 animate-float" style={{ animationDelay: "0.45s" }} />
                    <MdFavorite className="text-red-400/70 text-lg animate-float" style={{ animationDelay: "0.6s" }} />
                  </div>
                  <p className="text-white text-xl sm:text-2xl font-black leading-relaxed mb-4">
                    יחד, כצוות 16,<br />נוביל, נצליח ונישאר מאוחדים.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-5">
                    <div className="w-20 h-px bg-gradient-to-l from-dotan-gold to-transparent" />
                    <span className="text-dotan-gold font-black text-lg tracking-widest">16</span>
                    <div className="w-20 h-px bg-gradient-to-r from-dotan-gold to-transparent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="mt-8 text-center pb-4">
              <div className="inline-flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-px bg-gradient-to-l from-gray-300 to-transparent" />
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <div className="w-12 h-px bg-gradient-to-r from-gray-300 to-transparent" />
                </div>
                <span className="text-[11px] text-gray-400 font-bold tracking-wide">אמנת צוות 16  -  פלוגת דותן</span>
                <span className="text-[10px] text-gray-300 italic">מי שליבו בדרך אינו מפחד מהמרחק</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
