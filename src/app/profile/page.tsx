"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Avatar from "@/components/Avatar";
import { MdCameraAlt, MdPerson, MdHome, MdGroup, MdPhone, MdCake, MdRestaurant, MdMedicalServices, MdInfo, MdLanguage } from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";

interface UserProfile {
  id: string;
  name: string;
  nameEn: string | null;
  email: string;
  image: string | null;
  roomNumber: string | null;
  team: number | null;
  phone: string | null;
  birthDate: string | null;
  foodPreference: string | null;
  allergies: string | null;
  medicalExemptions: string | null;
  otherExemptions: string | null;
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [team, setTeam] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalExemptions, setMedicalExemptions] = useState("");
  const [otherExemptions, setOtherExemptions] = useState("");
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
      setNameEn(data.nameEn || "");
      setRoomNumber(data.roomNumber || "");
      setTeam(data.team?.toString() || "");
      setPhone(data.phone || "");
      setBirthDate(data.birthDate || "");
      setFoodPreference(data.foodPreference || "");
      setAllergies(data.allergies || "");
      setMedicalExemptions(data.medicalExemptions || "");
      setOtherExemptions(data.otherExemptions || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") fetchUser();
  }, [status, router, fetchUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, nameEn, roomNumber, team, phone, birthDate,
        foodPreference, allergies, medicalExemptions, otherExemptions,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setMessage(t.profile.profileUpdated);
    } else {
      setMessage(t.profile.profileUpdateError);
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/user/image", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setUser((prev) => (prev ? { ...prev, image: data.image } : null));
      setMessage(t.profile.photoUpdated);
    } else {
      const err = await res.json().catch(() => null);
      setMessage(err?.error || t.profile.photoUploadError);
    }
    setUploading(false);
  };

  if (status === "loading" || loading) {
    return <InlineLoading />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-dotan-green-dark mb-6 flex items-center gap-3">
        <MdPerson className="text-dotan-green" />
        {t.profile.title}
      </h1>

      <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-dotan-mint">
        {/* Avatar & upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3">
            <Avatar name={user?.name || ""} image={user?.image} size="lg" />
          </div>
          <label className="cursor-pointer bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition text-sm font-medium flex items-center gap-2">
            <MdCameraAlt />
            {uploading ? t.common.uploading : t.profile.uploadPhoto}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${
            message.includes(t.common.error) || message.includes("שגיאה") || message.includes("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-dotan-mint-light text-dotan-green-dark border border-dotan-green/30"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Email - read only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.profile.email}</label>
            <input type="email" value={user?.email || ""} disabled
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm" dir="ltr" />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdPerson className="text-gray-400" /> {t.profile.fullName}
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm" required />
          </div>

          {/* English Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdPerson className="text-gray-400" /> {t.profile.englishName}
            </label>
            <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder={t.profile.englishNamePlaceholder} dir="ltr" />
          </div>

          {/* Room & Team row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MdHome className="text-gray-400" /> {t.profile.roomNumber}
              </label>
              <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
                placeholder={t.profile.roomPlaceholder} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MdGroup className="text-gray-400" /> {t.profile.team}
              </label>
              <select value={team} onChange={(e) => setTeam(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm">
                <option value="">{t.teams.noTeam}</option>
                <option value="14">{t.teams.team14}</option>
                <option value="15">{t.teams.team15}</option>
                <option value="16">{t.teams.team16}</option>
                <option value="17">{t.teams.team17}</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdPhone className="text-gray-400" /> {t.profile.phone}
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder={t.profile.phonePlaceholder} dir="ltr" />
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdCake className="text-gray-400" /> {t.profile.birthDate}
            </label>
            <input type="text" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder={t.profile.birthDatePlaceholder} dir="ltr" />
          </div>

          {/* Food preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdRestaurant className="text-gray-400" /> {t.profile.foodPreference}
            </label>
            <input type="text" value={foodPreference} onChange={(e) => setFoodPreference(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder={t.profile.foodPlaceholder} />
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdMedicalServices className="text-gray-400" /> {t.profile.allergies}
            </label>
            <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm"
              placeholder={t.profile.allergiesPlaceholder} />
          </div>

          {/* Medical exemptions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdMedicalServices className="text-gray-400" /> {t.profile.medicalExemptions}
            </label>
            <textarea value={medicalExemptions} onChange={(e) => setMedicalExemptions(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm min-h-[60px]"
              placeholder={t.profile.medicalPlaceholder} />
          </div>

          {/* Other exemptions / info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdInfo className="text-gray-400" /> {t.profile.otherInfo}
            </label>
            <textarea value={otherExemptions} onChange={(e) => setOtherExemptions(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm min-h-[60px]"
              placeholder={t.profile.otherPlaceholder} />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MdLanguage className="text-gray-400" /> {t.profile.language}
            </label>
            <select value={locale} onChange={(e) => setLocale(e.target.value as "he" | "en")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dotan-green focus:border-transparent outline-none text-sm">
              <option value="he">{t.profile.hebrew}</option>
              <option value="en">{t.profile.english}</option>
            </select>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-dotan-green-dark text-white py-3 rounded-lg hover:bg-dotan-green transition font-medium disabled:opacity-50 text-sm sm:text-base">
            {saving ? t.common.saving : t.profile.saveChanges}
          </button>
        </form>
      </div>
    </div>
  );
}
