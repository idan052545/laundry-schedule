"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Check role → redirect accordingly
      try {
        const sessRes = await fetch("/api/auth/session");
        const sess = await sessRes.json();
        const role = sess?.user?.role;
        const mustChange = sess?.user?.mustChangePassword;
        if (mustChange) {
          router.push("/change-password");
        } else if (role === "simulator" || role === "simulator-admin") {
          router.push("/simulator");
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-dotan-mint">
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] rounded-full shadow overflow-hidden mx-auto mb-4">
            <Image src="/dotanLogo.png" alt={t.common.appName} width={72} height={72} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-dotan-green-dark">{t.auth.login}</h1>
          <p className="text-gray-500 mt-2">{t.auth.loginSubtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.auth.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none transition"
              placeholder="example@email.com"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.auth.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none transition"
              placeholder="********"
              required
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-dotan-green-dark text-white py-3 rounded-lg hover:bg-dotan-green transition font-medium disabled:opacity-50"
          >
            {loading ? t.auth.loggingIn : t.auth.loginBtn}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-dotan-green font-medium hover:underline">
            {t.auth.registerNow}
          </Link>
        </p>
      </div>
    </div>
  );
}
