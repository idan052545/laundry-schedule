"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Avatar from "@/components/Avatar";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roomNumber: string | null;
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/user");
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setName(data.name);
      setRoomNumber(data.roomNumber || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchUser();
    }
  }, [status, router, fetchUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, roomNumber }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setMessage("הפרופיל עודכן בהצלחה!");
    } else {
      setMessage("שגיאה בעדכון הפרופיל");
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/user/image", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setUser((prev) => (prev ? { ...prev, image: data.image } : null));
      setMessage("התמונה עודכנה בהצלחה!");
    } else {
      setMessage("שגיאה בהעלאת התמונה");
    }
    setUploading(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">הפרופיל שלי</h1>

      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Avatar name={user?.name || ""} image={user?.image} size="lg" />
          </div>
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            {uploading ? "מעלה..." : "העלה תמונה"}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg mb-6 ${
              message.includes("שגיאה")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם מלא
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מספר חדר
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="לדוגמה: 205"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </form>
      </div>
    </div>
  );
}
