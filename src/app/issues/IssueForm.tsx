"use client";

import { MdSend, MdPerson } from "react-icons/md";

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
  return (
    <form onSubmit={onSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-dotan-mint mb-4 space-y-3">
      <h3 className="font-bold text-gray-700 text-sm">תקלה חדשה</h3>

      <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
        placeholder="כותרת *" required />

      <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none min-h-[80px]"
        placeholder="תיאור..." />

      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
          placeholder="מיקום" />
        <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-dotan-green outline-none"
          placeholder="קישור תמונה" dir="ltr" />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
        <span className="text-xs font-medium text-amber-700 flex items-center gap-1"><MdPerson /> מלווה</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={formCompanion} onChange={(e) => setFormCompanion(e.target.value)}
            className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 outline-none bg-white"
            placeholder="שם מלווה" />
          <input type="tel" value={formCompanionPhone} onChange={(e) => setFormCompanionPhone(e.target.value)}
            className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-300 outline-none bg-white"
            placeholder="טלפון מלווה" dir="ltr" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={sending}
          className="bg-dotan-green-dark text-white px-5 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-2 disabled:opacity-50 text-sm">
          <MdSend /> {sending ? "שולח..." : "פתח תקלה"}
        </button>
      </div>
    </form>
  );
}
