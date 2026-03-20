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
  MdSmartToy, MdVolunteerActivism,
} from "react-icons/md";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { data: session } = useSession();
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
    { href: "/dashboard", label: "דף הבית", icon: MdHome },
    { href: "/schedule-daily", label: 'לו"ז', icon: MdCalendarMonth },
    { href: "/tasks", label: "משימות", icon: MdAssignment },
    { href: "/messages", label: "הודעות", icon: MdMessage },
    { href: "/forms", label: "טפסים", icon: MdDescription },
    { href: "/attendance", label: "מצל", icon: MdFactCheck },
  ];

  // Secondary links in "more" dropdown
  const isSimAdmin = ["עידן חן סימנטוב", "דולב כהן"].includes(session?.user?.name || "");
  const moreLinks = [
    { href: "/commander", label: "מפקדים", icon: MdStar },
    { href: "/issues", label: "תקלות", icon: MdBuild },
    { href: "/surveys", label: "סקרים", icon: MdPoll },
    { href: "/person-of-week", label: "איש השבוע", icon: MdEmojiEvents },
    { href: "/users-wall", label: "חיילים", icon: MdPeople },
    { href: "/materials", label: "חומר מקצועי", icon: MdMenuBook },
    { href: "/formats", label: "פורמטים", icon: MdFolder },
    { href: "/aktualia", label: "אקטואליה", icon: MdNewspaper },
    { href: "/birthdays", label: "ימי הולדת", icon: MdCake },
    { href: "/volunteers", label: "התנדבויות", icon: MdVolunteerActivism },
    { href: "/guard-duty", label: "שיבוץ תורנויות", icon: MdSecurity },
    { href: "/daily-quote", label: "משפט היומי", icon: MdAutoAwesome },
    { href: "/amana", label: "אמנה צוותית", icon: MdFavorite },
    { href: "/schedule", label: "מכבסה", icon: MdLocalLaundryService },
    { href: "/notifications", label: "שליחת התראות", icon: MdNotifications },
    ...(isSimAdmin ? [{ href: "/simulator", label: "סימולטור פיקודי", icon: MdSmartToy }] : []),
    { href: "/profile", label: "פרופיל", icon: MdPerson },
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
              <Image src="/dotanLogo.png" alt="פלוגת דותן" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold hidden sm:block">פלוגת דותן</span>
          </Link>

          {/* Mobile: bell + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            {session && <NotificationBell />}
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
                    עוד
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
                <span className="text-dotan-mint text-xs mr-1">{session.user?.name}</span>
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-dotan-gold text-dotan-green-dark hover:bg-dotan-gold-dark px-2.5 py-1.5 rounded-lg text-xs transition font-medium flex items-center gap-1">
                  <MdLogout className="text-sm" />
                  התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-dotan-gold transition flex items-center gap-1 text-sm">
                  <MdLogin className="text-lg" /> התחברות
                </Link>
                <Link href="/register" className="bg-dotan-gold text-dotan-green-dark px-4 py-2 rounded-lg hover:bg-dotan-gold-dark transition font-medium flex items-center gap-1 text-sm">
                  <MdPersonAdd className="text-lg" /> הרשמה
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
                  <span className="text-[10px] font-medium">התנתק</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-3">
                <Link href="/login" className="flex items-center gap-2 py-2 hover:text-dotan-gold">
                  <MdLogin /> התחברות
                </Link>
                <Link href="/register" className="flex items-center gap-2 py-2 hover:text-dotan-gold">
                  <MdPersonAdd /> הרשמה
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
