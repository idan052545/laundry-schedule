"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { MdMenu, MdClose, MdHome, MdCalendarMonth, MdPerson, MdLogout, MdLogin, MdPersonAdd, MdMessage, MdFactCheck, MdLocalLaundryService, MdCake, MdAssignment, MdPeople, MdStar } from "react-icons/md";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "דף הבית", icon: MdHome },
    { href: "/schedule", label: "מכבסה", icon: MdLocalLaundryService },
    { href: "/messages", label: "הודעות", icon: MdMessage },
    { href: "/attendance", label: "מצל", icon: MdFactCheck },
    { href: "/birthdays", label: "ימי הולדת", icon: MdCake },
    { href: "/tasks", label: "משימות", icon: MdAssignment },
    { href: "/commander", label: "מפקדים", icon: MdStar },
    { href: "/users-wall", label: "חיילים", icon: MdPeople },
    { href: "/profile", label: "פרופיל", icon: MdPerson },
  ];

  return (
    <nav className="bg-dotan-green-dark text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Image src="/dotanLogo.png" alt="פלוגת דותן" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold hidden sm:block">פלוגת דותן</span>
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-dotan-green"
          >
            {menuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
          </button>

          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <>
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="hover:text-dotan-gold transition flex items-center gap-1 text-sm">
                    <Icon className="text-lg" />
                    {label}
                  </Link>
                ))}
                <span className="text-dotan-mint text-sm mr-2">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-dotan-gold text-dotan-green-dark hover:bg-dotan-gold-dark px-3 py-1.5 rounded-lg text-sm transition font-medium flex items-center gap-1"
                >
                  <MdLogout className="text-lg" />
                  התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-dotan-gold transition flex items-center gap-1">
                  <MdLogin className="text-lg" />
                  התחברות
                </Link>
                <Link href="/register" className="bg-dotan-gold text-dotan-green-dark px-4 py-2 rounded-lg hover:bg-dotan-gold-dark transition font-medium flex items-center gap-1">
                  <MdPersonAdd className="text-lg" />
                  הרשמה
                </Link>
              </>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {session ? (
              <>
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2 py-2 hover:text-dotan-gold" onClick={() => setMenuOpen(false)}>
                    <Icon /> {label}
                  </Link>
                ))}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full text-right py-2 text-dotan-gold hover:text-dotan-gold-dark"
                >
                  <MdLogout /> התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="flex items-center gap-2 py-2 hover:text-dotan-gold" onClick={() => setMenuOpen(false)}>
                  <MdLogin /> התחברות
                </Link>
                <Link href="/register" className="flex items-center gap-2 py-2 hover:text-dotan-gold" onClick={() => setMenuOpen(false)}>
                  <MdPersonAdd /> הרשמה
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
