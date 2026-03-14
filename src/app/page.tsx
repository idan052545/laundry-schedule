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
        {/* Main logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/dotanLogo.png"
            alt="פלוגת דותן"
            width={140}
            height={140}
            className="rounded-full shadow-xl border-4 border-white"
          />
        </div>

        {/* Side logos */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Image src="/erezLogo.png" alt="ארז" width={48} height={48} className="rounded-full shadow border-2 border-white bg-white p-0.5" />
          <Image src="/bahad1Logo.png" alt="בהד 1" width={48} height={48} className="rounded-full shadow border-2 border-white bg-white p-0.5" />
        </div>

        <h1 className="text-4xl font-bold text-dotan-green-dark mb-2">
          פלוגת דותן
        </h1>
        <h2 className="text-xl font-semibold text-dotan-green mb-4">
          מערכת ניהול הפלוגה
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          מכבסה, הודעות, מצל, ימי הולדת ועוד - הכל במקום אחד
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
