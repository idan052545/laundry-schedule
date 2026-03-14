"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { MdLocalLaundryService, MdMenu, MdClose, MdHome, MdCalendarMonth, MdPerson, MdLogout, MdLogin, MdPersonAdd } from "react-icons/md";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="text-xl font-bold flex items-center gap-2">
            <MdLocalLaundryService className="text-2xl" />
            <span>מכבסה - לוח זמנים</span>
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-blue-700"
          >
            {menuOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
          </button>

          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link href="/dashboard" className="hover:text-blue-200 transition flex items-center gap-1">
                  <MdHome className="text-lg" />
                  דף הבית
                </Link>
                <Link href="/schedule" className="hover:text-blue-200 transition flex items-center gap-1">
                  <MdCalendarMonth className="text-lg" />
                  לוח זמנים
                </Link>
                <Link href="/profile" className="hover:text-blue-200 transition flex items-center gap-1">
                  <MdPerson className="text-lg" />
                  פרופיל
                </Link>
                <span className="text-blue-200 text-sm">
                  שלום, {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition flex items-center gap-1"
                >
                  <MdLogout className="text-lg" />
                  התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-blue-200 transition flex items-center gap-1">
                  <MdLogin className="text-lg" />
                  התחברות
                </Link>
                <Link
                  href="/register"
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition flex items-center gap-1"
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
                <Link href="/dashboard" className="flex items-center gap-2 py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  <MdHome /> דף הבית
                </Link>
                <Link href="/schedule" className="flex items-center gap-2 py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  <MdCalendarMonth /> לוח זמנים
                </Link>
                <Link href="/profile" className="flex items-center gap-2 py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  <MdPerson /> פרופיל
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full text-right py-2 text-red-300 hover:text-red-200"
                >
                  <MdLogout /> התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="flex items-center gap-2 py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  <MdLogin /> התחברות
                </Link>
                <Link href="/register" className="flex items-center gap-2 py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
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
