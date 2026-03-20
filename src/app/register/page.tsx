"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/i18n";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, roomNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError(t.auth.registerError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-dotan-mint">
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] rounded-full shadow overflow-hidden mx-auto mb-4">
            <Image src="/dotanLogo.png" alt={t.common.appName} width={72} height={72} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-dotan-green-dark">{t.auth.register}</h1>
          <p className="text-gray-500 mt-2">{t.auth.registerSubtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.auth.fullName}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none transition"
              placeholder={t.auth.fullNamePlaceholder} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.auth.email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none transition"
              placeholder="example@email.com" required dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.auth.password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none transition"
              placeholder="********" required minLength={6} dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.auth.roomNumber}</label>
            <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none transition"
              placeholder={t.auth.roomPlaceholder} dir="ltr" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-dotan-green-dark text-white py-3 rounded-lg hover:bg-dotan-green transition font-medium disabled:opacity-50">
            {loading ? t.auth.registering : t.auth.registerBtn}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="text-dotan-green font-medium hover:underline">{t.auth.loginBtn}</Link>
        </p>
      </div>
    </div>
  );
}
