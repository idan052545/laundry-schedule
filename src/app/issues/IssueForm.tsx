"use client";

import { MdSend, MdPerson } from "react-icons/md";
import { useLanguage } from "@/i18n";

interface IssueFormProps {
  formTitle: string;
  setFormTitle: (v: string) => void;
  formDesc: string;
  setFormDesc: (v: string) => void;
  formLocation: string;
  setFormLocation: (v: string) => void;
  formImageUrl: string;
  setFormImageUrl: (v: string) => void;
  formCompanion: string;
  setFormCompanion: (v: string) => void;
  formCompanionPhone: string;
  setFormCompanionPhone: (v: string) => void;
  sending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function IssueForm({
  formTitle, setFormTitle, formDesc, setFormDesc,
  formLocation, setFormLocation, formImageUrl, setFormImageUrl,
  formCompanion, setFormCompanion, formCompanionPhone, setFormCompanionPhone,
  sending, onSubmit,
}: IssueFormProps) {
  const { t } = useLanguage();
  return (
    <form onSubmit={onSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 space-y-3">
      <h3 className="font-bold text-gray-700 text-sm">{t.issues.newIssue}</h3>

      <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
        placeholder={t.issues.issueTitle} required />

      <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[80px]"
        placeholder={t.issues.descriptionPlaceholder} />

      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
          placeholder={t.issues.location} />
        <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
          placeholder={t.issues.imageUrl} dir="ltr" />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
        <span className="text-xs font-medium text-amber-700 flex items-center gap-1"><MdPerson /> {t.issues.companion}</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={formCompanion} onChange={(e) => setFormCompanion(e.target.value)}
            className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 outline-none bg-white"
            placeholder={t.issues.companionName} />
          <input type="tel" value={formCompanionPhone} onChange={(e) => setFormCompanionPhone(e.target.value)}
            className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 outline-none bg-white"
            placeholder={t.issues.companionPhone} dir="ltr" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={sending}
          className="bg-dotan-green-dark text-white px-5 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
          <MdSend /> {sending ? t.common.sending : t.issues.submitIssue}
        </button>
      </div>
    </form>
  );
}
