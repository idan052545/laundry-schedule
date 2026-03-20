"use client";

import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import type { SectionKey, DashStyle } from "./types";
import { SECTION_LABELS } from "./constants";

interface SettingsPanelProps {
  visible: Set<SectionKey>;
  toggleSection: (key: SectionKey) => void;
  dashStyle: DashStyle;
  setDashStyle: (style: DashStyle) => void;
  isRealAdmin: boolean;
  sagalMode: boolean;
  setSagalMode: (val: boolean) => void;
  onClose: () => void;
}

export default function SettingsPanel({
  visible, toggleSection, dashStyle, setDashStyle,
  isRealAdmin, sagalMode, setSagalMode, onClose,
}: SettingsPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-700">מה להציג בדף הבית?</span>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">סגור</button>
      </div>
      {/* Style toggle */}
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
        {([["new", "כרטיסים"], ["carousel", "קרוסלה"], ["classic", "קלאסי"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setDashStyle(key); localStorage.setItem("dashboard-style", key); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${dashStyle === key ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SECTION_LABELS) as SectionKey[]).map(key => (
          <button key={key} onClick={() => toggleSection(key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              visible.has(key) ? "bg-dotan-green-dark text-white" : "bg-gray-100 text-gray-400"
            }`}>
            {visible.has(key) ? <MdVisibility className="text-sm" /> : <MdVisibilityOff className="text-sm" />}
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>
      {/* Admin: sagal QA mode toggle */}
      {isRealAdmin && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button onClick={() => { const next = !sagalMode; setSagalMode(next); localStorage.setItem("sagal-mode", String(next)); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition w-full ${
              sagalMode ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}>
            <MdVisibility className="text-sm" />
            {sagalMode ? "מצב סגל פעיל — לחץ לכבות" : "מצב סגל (QA)"}
          </button>
        </div>
      )}
    </div>
  );
}
