"use client";

import { useSession, signOut } from "next-auth/react";
import { MdSmartToy, MdLogout, MdPerson } from "react-icons/md";
import { useLanguage } from "@/i18n";

export default function SimulatorNavbar() {
  const { data: session } = useSession();
  const { t } = useLanguage();

  return (
    <nav className="bg-gradient-to-l from-purple-800 to-blue-800 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <MdSmartToy className="text-xl text-white" />
            </div>
            <span className="text-base font-bold">{t.nav.simulator}</span>
          </div>

          {/* User info + logout */}
          {session && (
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-xs flex items-center gap-1">
                <MdPerson className="text-sm" />
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-xs transition font-medium flex items-center gap-1"
              >
                <MdLogout className="text-sm" />
                {t.nav.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
