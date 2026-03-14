"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
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
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-dotan-mint">
        <div className="text-center mb-8">
          <Image src="/dotanLogo.png" alt="פלוגת דותן" width={72} height={72} className="rounded-full mx-auto mb-4 shadow" />
          <h1 className="text-3xl font-bold text-dotan-green-dark">התחברות</h1>
          <p className="text-gray-500 mt-2">היכנס לחשבון שלך</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אימייל
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
              סיסמה
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
            {loading ? "מתחבר..." : "התחבר"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500">
          אין לך חשבון?{" "}
          <Link href="/register" className="text-dotan-green font-medium hover:underline">
            הרשם עכשיו
          </Link>
        </p>
      </div>
    </div>
  );
}
