"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import Image from "next/image";
import { useLanguage } from "@/i18n";

export default function ChangePasswordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "loading") return null;
  if (status === "unauthenticated") { router.push("/login"); return null; }

  const userName = session?.user?.name?.split(" ")[0] || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t.auth.passwordMinLength);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || t.auth.changePasswordError);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-dotan-mint">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full shadow overflow-hidden mx-auto mb-4">
            <Image src="/dotanLogo.png" alt="דותן" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{t.auth.changePasswordGreeting.replace("{name}", userName)}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.auth.changePasswordSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">{t.auth.newPassword}</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.auth.newPasswordPlaceholder}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-green-300 transition"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">{t.auth.confirmPassword}</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={t.auth.confirmPasswordPlaceholder}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading || !password || !confirm}
            className="w-full py-3 rounded-xl bg-dotan-green text-white font-bold text-sm shadow hover:bg-dotan-green-dark transition disabled:opacity-50">
            <MdLock className="inline text-base ms-1" />
            {loading ? t.auth.changing : t.auth.changePassword}
          </button>
        </form>
      </div>
    </div>
  );
}
