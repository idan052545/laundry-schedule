"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MdMenu, MdClose, MdHome, MdCalendarMonth, MdPerson, MdLogout,
  MdLogin, MdPersonAdd, MdMessage, MdFactCheck, MdLocalLaundryService,
  MdCake, MdAssignment, MdPeople, MdStar, MdDescription, MdMenuBook,
  MdFolder, MdNotifications, MdNewspaper, MdMoreHoriz, MdBuild,
  MdPoll, MdEmojiEvents, MdFavorite, MdAutoAwesome, MdSecurity,
  MdSmartToy, MdVolunteerActivism, MdFlashOn,
} from "react-icons/md";
import NotificationBell from "./NotificationBell";
import { useLanguage } from "@/i18n";

export default function Navbar() {
  const { data: session } = useSession();
  const { t, locale, setLocale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // Force password change redirect
  const mustChangePassword = (session?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword;
  useEffect(() => {
    if (mustChangePassword && pathname !== "/change-password") {
      router.push("/change-password");
    }
  }, [mustChangePassword, pathname, router]);

  // Listen for service worker notification click messages
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data.url) {
        router.push(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [router]);

  // Close "more" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Primary links shown directly in the navbar
  const primaryLinks = [
    { href: "/dashboard", label: t.nav.home, icon: MdHome },
    { href: "/schedule-daily", label: t.nav.schedule, icon: MdCalendarMonth },
    { href: "/tasks", label: t.nav.tasks, icon: MdAssignment },
    { href: "/messages", label: t.nav.messages, icon: MdMessage },
    { href: "/forms", label: t.nav.forms, icon: MdDescription },
    { href: "/attendance", label: t.nav.attendance, icon: MdFactCheck },
  ];

  // Secondary links in "more" dropdown
  const isSimAdmin = ["עידן חן סימנטוב", "דולב כהן"].includes(session?.user?.name || "");
  const moreLinks = [
    { href: "/commander", label: t.nav.commanders, icon: MdStar },
    { href: "/issues", label: t.nav.issues, icon: MdBuild },
    { href: "/surveys", label: t.nav.surveys, icon: MdPoll },
    { href: "/person-of-week", label: t.nav.personOfWeek, icon: MdEmojiEvents },
    { href: "/users-wall", label: t.nav.soldiers, icon: MdPeople },
    { href: "/materials", label: t.nav.materials, icon: MdMenuBook },
    { href: "/formats", label: t.nav.formats, icon: MdFolder },
    { href: "/aktualia", label: t.nav.aktualia, icon: MdNewspaper },
    { href: "/birthdays", label: t.nav.birthdays, icon: MdCake },
    { href: "/volunteers", label: t.nav.volunteers, icon: MdVolunteerActivism },
    { href: "/guard-duty", label: t.nav.guardDuty, icon: MdSecurity },
    { href: "/mamash", label: t.nav.mamash, icon: MdFlashOn },
    { href: "/daily-quote", label: t.nav.dailyQuote, icon: MdAutoAwesome },
    { href: "/amana", label: t.nav.teamAmana, icon: MdFavorite },
    { href: "/schedule", label: t.nav.laundry, icon: MdLocalLaundryService },
    { href: "/notifications", label: t.nav.notifications, icon: MdNotifications },
    ...(isSimAdmin ? [{ href: "/simulator", label: t.nav.simulator, icon: MdSmartToy }] : []),
    { href: "/profile", label: t.nav.profile, icon: MdPerson },
  ];

  const allLinks = [...primaryLinks, ...moreLinks];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-dotan-green-dark text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              <Image src="/dotanLogo.png" alt={t.common.appName} width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold hidden sm:block">{t.common.appName}</span>
          </Link>

          {/* Mobile: bell + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            {session && <NotificationBell />}
            <button
              onClick={() => setLocale(locale === "he" ? "en" : "he")}
              className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              {locale === "he" ? "EN" : "עב"}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-md hover:bg-dotan-green transition">
              {menuOpen ? <MdClose className="w-5 h-5" /> : <MdMenu className="w-5 h-5" />}
            </button>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {session ? (
              <>
                {primaryLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                      isActive(href) ? "bg-white/15 text-dotan-gold" : "hover:bg-white/10 text-white/90"
                    }`}>
                    <Icon className="text-base" />
                    {label}
                  </Link>
                ))}

                {/* More dropdown */}
                <div className="relative" ref={moreRef}>
                  <button onClick={() => setMoreOpen(!moreOpen)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                      moreOpen || moreLinks.some(l => isActive(l.href))
                        ? "bg-white/15 text-dotan-gold"
                        : "hover:bg-white/10 text-white/90"
                    }`}>
                    <MdMoreHoriz className="text-base" />
                    {t.nav.more}
                  </button>
                  {moreOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[180px] z-50">
                      {moreLinks.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${
                            isActive(href)
                              ? "bg-dotan-mint-light text-dotan-green-dark font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}>
                          <Icon className={`text-lg ${isActive(href) ? "text-dotan-green" : "text-gray-400"}`} />
                          {label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-white/20 mx-1" />
                <NotificationBell />
                <button
                  onClick={() => setLocale(locale === "he" ? "en" : "he")}
                  className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                >
                  {locale === "he" ? "EN" : "עב"}
                </button>
                <span className="text-dotan-mint text-xs me-1">{session.user?.name}</span>
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-dotan-gold text-dotan-green-dark hover:bg-dotan-gold-dark px-2.5 py-1.5 rounded-lg text-xs transition font-medium flex items-center gap-1">
                  <MdLogout className="text-sm" />
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-dotan-gold transition flex items-center gap-1 text-sm">
                  <MdLogin className="text-lg" /> {t.nav.login}
                </Link>
                <Link href="/register" className="bg-dotan-gold text-dotan-green-dark px-4 py-2 rounded-lg hover:bg-dotan-gold-dark transition font-medium flex items-center gap-1 text-sm">
                  <MdPersonAdd className="text-lg" /> {t.nav.register}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-white/10 mt-1">
            {session ? (
              <div className="grid grid-cols-3 gap-1 pt-3">
                {allLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className={`flex flex-col items-center gap-1 py-3 rounded-lg text-center transition ${
                      isActive(href) ? "bg-white/15 text-dotan-gold" : "hover:bg-white/10 text-white/80"
                    }`}>
                    <Icon className="text-xl" />
                    <span className="text-[10px] font-medium leading-tight">{label}</span>
                  </Link>
                ))}
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex flex-col items-center gap-1 py-3 rounded-lg text-dotan-gold hover:bg-white/10 transition">
                  <MdLogout className="text-xl" />
                  <span className="text-[10px] font-medium">{t.nav.logout}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-3">
                <Link href="/login" className="flex items-center gap-2 py-2 hover:text-dotan-gold">
                  <MdLogin /> {t.nav.login}
                </Link>
                <Link href="/register" className="flex items-center gap-2 py-2 hover:text-dotan-gold">
                  <MdPersonAdd /> {t.nav.register}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
