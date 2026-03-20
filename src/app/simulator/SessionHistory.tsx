"use client";

import { MdArrowBack, MdHistory, MdRecordVoiceOver } from "react-icons/md";
import { useLanguage } from "@/i18n";
import { SimSession } from "./types";

export function SessionHistory({ sessions, onBack, onViewFeedback }: {
  sessions: SimSession[];
  onBack: () => void;
  onViewFeedback: (s: SimSession) => void;
}) {
  const { t, dateLocale } = useLanguage();
  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        <MdArrowBack /> {t.common.back}
      </button>
      <h1 className="text-xl font-bold text-dotan-green-dark mb-4 flex items-center gap-2">
        <MdHistory className="text-dotan-gold" /> {t.simulator.simulationHistory}
      </h1>

      <div className="space-y-3">
        {sessions.map(sess => (
          <button key={sess.id} onClick={() => sess.status === "completed" ? onViewFeedback(sess) : undefined}
            className={`w-full text-start bg-white p-4 rounded-xl shadow-sm border-2 transition ${
              sess.status === "completed" ? "border-gray-100 hover:border-dotan-green cursor-pointer" : "border-gray-100 cursor-default"
            }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-sm truncate">{sess.scenario.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{new Date(sess.startedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>•</span>
                  <span>{sess.mode === "voice" ? t.simulator.voice : t.simulator.chat}</span>
                  {sess.user && <><span>•</span><span>{sess.user.name}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {sess.score !== null && (
                  <span className={`text-sm px-2.5 py-1 rounded-full font-bold ${sess.score >= 70 ? "bg-green-50 text-green-600" : sess.score >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                    {sess.score}/100
                  </span>
                )}
                {sess.grade && (
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${sess.grade === "עובר" ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {sess.grade}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  sess.status === "completed" ? "bg-green-50 text-green-600" : sess.status === "active" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {sess.status === "completed" ? t.simulator.completed : sess.status === "active" ? t.simulator.active : t.simulator.abandoned}
                </span>
              </div>
            </div>
          </button>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MdHistory className="text-4xl mx-auto mb-2 text-gray-300" />
            <p>{t.simulator.noSessions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
