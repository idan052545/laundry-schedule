"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { MdMenu, MdClose, MdHome, MdCalendarMonth, MdPerson, MdLogout, MdLogin, MdPersonAdd } from "react-icons/md";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-dotan-green-dark text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/dotanLogo.jpeg" alt="פלוגת דותן" width={40} height={40} className="rounded-full" />
            <span className="text-lg font-bold">מכבסת דותן</span>
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-dotan-green"
          >
            {menuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
          </button>

          <div className="hidden md:flex items-center gap-5">
            {session ? (
              <>
                <Link href="/dashboard" className="hover:text-dotan-gold transition flex items-center gap-1 text-sm">
                  <MdHome className="text-lg" />
                  דף הבית
                </Link>
                <Link href="/schedule" className="hover:text-dotan-gold transition flex items-center gap-1 text-sm">
                  <MdCalendarMonth className="text-lg" />
                  לוח זמנים
                </Link>
                <Link href="/profile" className="hover:text-dotan-gold transition flex items-center gap-1 text-sm">
                  <MdPerson className="text-lg" />
                  פרופיל
                </Link>
                <span className="text-dotan-mint text-sm">
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
                <Link
                  href="/register"
                  className="bg-dotan-gold text-dotan-green-dark px-4 py-2 rounded-lg hover:bg-dotan-gold-dark transition font-medium flex items-center gap-1"
                >
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
                <Link href="/dashboard" className="flex items-center gap-2 py-2 hover:text-dotan-gold" onClick={() => setMenuOpen(false)}>
                  <MdHome /> דף הבית
                </Link>
                <Link href="/schedule" className="flex items-center gap-2 py-2 hover:text-dotan-gold" onClick={() => setMenuOpen(false)}>
                  <MdCalendarMonth /> לוח זמנים
                </Link>
                <Link href="/profile" className="flex items-center gap-2 py-2 hover:text-dotan-gold" onClick={() => setMenuOpen(false)}>
                  <MdPerson /> פרופיל
                </Link>
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
