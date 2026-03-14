"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { MdLocalLaundryService, MdLogin, MdPersonAdd } from "react-icons/md";

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
        <MdLocalLaundryService className="text-7xl text-blue-600 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          מכבסה - לוח זמנים
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          מערכת ניהול תורות למכבסה ומייבש. קבע תור, בדוק זמינות, ודע מתי המכונה פנויה!
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-lg flex items-center gap-2"
          >
            <MdLogin />
            התחבר
          </Link>
          <Link
            href="/register"
            className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition font-medium text-lg flex items-center gap-2"
          >
            <MdPersonAdd />
            הרשם
          </Link>
        </div>
      </div>
    </div>
  );
}
