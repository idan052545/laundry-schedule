"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MdLogin, MdPersonAdd } from "react-icons/md";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center max-w-lg">
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <Image src="/bahad1Logo.png" alt="בהד 1" width={64} height={64} className="rounded-full" />
          <Image src="/dotanLogo.jpeg" alt="פלוגת דותן" width={96} height={96} className="rounded-full shadow-lg" />
          <Image src="/erezLogo.png" alt="ארז" width={64} height={64} className="rounded-full" />
        </div>

        <h1 className="text-4xl font-bold text-dotan-green-dark mb-2">
          פלוגת דותן
        </h1>
        <h2 className="text-2xl font-semibold text-dotan-green mb-4">
          מכבסה - לוח זמנים
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          מערכת ניהול תורות למכבסה ומייבש. קבע תור, בדוק זמינות, ודע מתי המכונה פנויה!
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-dotan-green-dark text-white px-8 py-3 rounded-lg hover:bg-dotan-green transition font-medium text-lg flex items-center gap-2"
          >
            <MdLogin />
            התחבר
          </Link>
          <Link
            href="/register"
            className="bg-dotan-gold text-dotan-green-dark border-2 border-dotan-gold px-8 py-3 rounded-lg hover:bg-dotan-gold-dark transition font-medium text-lg flex items-center gap-2"
          >
            <MdPersonAdd />
            הרשם
          </Link>
        </div>
      </div>
    </div>
  );
}
