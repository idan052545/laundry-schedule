"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "./Navbar";
import SimulatorNavbar from "./SimulatorNavbar";
import { useLanguage } from "@/i18n";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  const pathname = usePathname();
  const router = useRouter();

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isSimulatorUser = userRole === "simulator" || userRole === "simulator-admin";

  // Simulator-only users: redirect to /simulator if they try to access anything else
  useEffect(() => {
    if (status !== "authenticated" || !isSimulatorUser) return;
    if (pathname !== "/simulator" && pathname !== "/login" && pathname !== "/api/auth/signin") {
      router.replace("/simulator");
    }
  }, [status, isSimulatorUser, pathname, router]);

  // Simulator-only users get a clean, standalone UI
  if (isSimulatorUser) {
    return (
      <>
        <SimulatorNavbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </>
    );
  }

  // Regular users get the full app
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="text-center py-5 mt-8 border-t border-dotan-mint">
        <p className="text-sm text-gray-500">
          {t.footer.builtBy} <span className="font-bold text-dotan-green-dark">{t.footer.builderName}</span> <span className="text-xs bg-dotan-mint-light text-dotan-green-dark px-2 py-0.5 rounded-full font-medium me-1">{t.teams.team16}</span>
        </p>
      </footer>
    </>
  );
}
