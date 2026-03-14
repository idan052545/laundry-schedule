"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="text-xl font-bold">
            🧺 מכבסה - לוח זמנים
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-blue-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link href="/dashboard" className="hover:text-blue-200 transition">
                  דף הבית
                </Link>
                <Link href="/schedule" className="hover:text-blue-200 transition">
                  לוח זמנים
                </Link>
                <Link href="/profile" className="hover:text-blue-200 transition">
                  פרופיל
                </Link>
                <span className="text-blue-200 text-sm">
                  שלום, {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition"
                >
                  התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-blue-200 transition">
                  התחברות
                </Link>
                <Link
                  href="/register"
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                >
                  הרשמה
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {session ? (
              <>
                <Link href="/dashboard" className="block py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  דף הבית
                </Link>
                <Link href="/schedule" className="block py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  לוח זמנים
                </Link>
                <Link href="/profile" className="block py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  פרופיל
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="block w-full text-right py-2 text-red-300 hover:text-red-200"
                >
                  התנתק
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  התחברות
                </Link>
                <Link href="/register" className="block py-2 hover:text-blue-200" onClick={() => setMenuOpen(false)}>
                  הרשמה
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
