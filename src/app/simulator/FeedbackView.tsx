"use client";

import { useState } from "react";
import {
  MdArrowBack, MdClose, MdChat, MdRecordVoiceOver,
  MdEdit, MdCheckCircle, MdVolumeUp,
  MdPerson, MdSmartToy, MdFeedback, MdStar,
} from "react-icons/md";
import { useLanguage } from "@/i18n";
import { SimSession, ChatMessage } from "./types";

// ─── Feedback Parser ───
// Parses the structured AI feedback into sections
function parseFeedback(text: string) {
  const sections: { type: string; title: string; items: string[] }[] = [];
  let summary = "";
  let goalCheck = "";

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let currentSection: { type: string; title: string; items: string[] } | null = null;

  for (const line of lines) {
    // Detect goal check line
    if (line.includes("האם") && line.includes("מטרת הסימולציה")) {
      goalCheck = line.replace(/\*\*/g, "");
      continue;
    }

    // Detect section headers
    const headerMatch = line.match(/^\*?\*?(.+?):\*?\*?\s*$/);
    const isBullet = line.startsWith("*") || line.startsWith("-") || line.startsWith("•");

    if (headerMatch && !isBullet) {
      const title = headerMatch[1].replace(/\*\*/g, "").trim();
      // Map known section titles
      if (title.includes("נקודות לשימור") || title.includes("שימור")) {
        currentSection = { type: "positive", title: "נקודות לשימור", items: [] };
        sections.push(currentSection);
      } else if (title.includes("נקודות לשיפור") || title.includes("שיפור")) {
        currentSection = { type: "improve", title: "נקודות לשיפור", items: [] };
        sections.push(currentSection);
      } else if (title.includes("מיומנויות לציון") || title.includes("לציון לחיוב")) {
        currentSection = { type: "skill-good", title: "מיומנויות לציון לחיוב", items: [] };
        sections.push(currentSection);
      } else if (title.includes("מיומנויות נדרשות") || title.includes("לחיזוק")) {
        currentSection = { type: "skill-improve", title: "מיומנויות נדרשות לחיזוק", items: [] };
        sections.push(currentSection);
      } else if (title.includes("הערכות מיומנויות") || (title === "מיומנויות" && !title.includes("לציון") && !title.includes("נדרשות"))) {
        // Parent section header, skip
        continue;
      } else if (title.includes("טון דיבור") || title.includes("הערכת טון")) {
        currentSection = { type: "tone", title: "הערכת טון דיבור", items: [] };
        sections.push(currentSection);
      } else {
        currentSection = { type: "other", title, items: [] };
        sections.push(currentSection);
      }
      continue;
    }

    // Add bullet items to current section
    if (isBullet && currentSection) {
      const cleaned = line.replace(/^[\*\-•]\s*/, "").replace(/\*\*/g, "").trim();
      if (cleaned) currentSection.items.push(cleaned);
      continue;
    }

    // If no section yet, it's the summary
    if (!currentSection && sections.length === 0 && !goalCheck) {
      summary += (summary ? " " : "") + line.replace(/\*\*/g, "");
    } else if (currentSection && !isBullet) {
      // Non-bullet text in a section — treat as an item
      const cleaned = line.replace(/\*\*/g, "").trim();
      if (cleaned) currentSection.items.push(cleaned);
    }
  }

  return { summary, goalCheck, sections };
}

export function FeedbackView({ session: sess, onBack }: {
  session: SimSession;
  onBack: () => void;
}) {
  const { t, dateLocale } = useLanguage();
  const messages: ChatMessage[] = sess.messages ? JSON.parse(sess.messages) : [];
  const [showTranscript, setShowTranscript] = useState(false);
  const score = sess.score ?? 0;
  const parsed = sess.feedback ? parseFeedback(sess.feedback) : null;

  // Score ring calculation
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;
  const scoreColor = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const scoreBg = score >= 70 ? "from-green-500 to-emerald-600" : score >= 40 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-600";

  const sectionConfig: Record<string, { icon: typeof MdCheckCircle; color: string; bg: string; border: string }> = {
    positive: { icon: MdCheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    improve: { icon: MdEdit, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    "skill-good": { icon: MdStar, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    "skill-improve": { icon: MdFeedback, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    tone: { icon: MdVolumeUp, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
    other: { icon: MdFeedback, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        <MdArrowBack /> {t.simulator.backToScenarios}
      </button>

      {/* Score Hero Card */}
      <div className={`bg-gradient-to-bl ${scoreBg} rounded-2xl p-6 sm:p-8 mb-5 text-white shadow-lg relative overflow-hidden`}>
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-10 -translate-y-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 translate-y-8"></div>

        <div className="flex items-center gap-6 relative z-10">
          {/* Score Ring */}
          <div className="relative shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="white" strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl font-black leading-none">{score}</span>
              <span className="text-[10px] text-white/60 mt-0.5">{t.simulator.outOf100}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">{sess.scenario.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/70">
              <span className="flex items-center gap-1">
                {sess.mode === "voice" ? <MdRecordVoiceOver className="text-sm" /> : <MdChat className="text-sm" />}
                {sess.mode === "voice" ? t.simulator.voice : t.simulator.chat}
              </span>
              <span>{t.simulator.difficulty} {sess.scenario.difficulty}/10</span>
              {sess.completedAt && <span>{new Date(sess.completedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long" })}</span>}
            </div>
            {sess.grade && (
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full ${
                  sess.grade === "עובר" ? "bg-white/25 text-white" : "bg-white/20 text-white"
                }`}>
                  {sess.grade === "עובר" ? <MdCheckCircle /> : <MdClose />}
                  {sess.grade}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goal Check */}
      {parsed?.goalCheck && (
        <div className={`rounded-xl p-4 mb-4 border-2 ${score >= 60 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${score >= 60 ? "bg-green-100" : "bg-amber-100"}`}>
              {score >= 60 ? <MdCheckCircle className="text-green-600 text-lg" /> : <MdFeedback className="text-amber-600 text-lg" />}
            </div>
            <div>
              <h3 className={`text-sm font-bold ${score >= 60 ? "text-green-800" : "text-amber-800"}`}>{t.simulator.goalAchievement}</h3>
              <p className={`text-sm mt-1 leading-relaxed ${score >= 60 ? "text-green-700" : "text-amber-700"}`}>{parsed.goalCheck}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {parsed?.summary && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{parsed.summary}</p>
        </div>
      )}

      {/* Structured Sections */}
      {parsed?.sections && parsed.sections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {parsed.sections.map((section, i) => {
            const cfg = sectionConfig[section.type] || sectionConfig.other;
            const Icon = cfg.icon;
            return (
              <div key={i} className={`${cfg.bg} rounded-xl border ${cfg.border} p-4`}>
                <h3 className={`text-sm font-bold ${cfg.color} flex items-center gap-1.5 mb-2.5`}>
                  <Icon className="text-base" /> {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace("text-", "bg-")} mt-1.5 shrink-0`}></span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                  {section.items.length === 0 && (
                    <li className="text-xs text-gray-400">{t.simulator.noData}</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback: raw feedback if parsing found nothing */}
      {sess.feedback && (!parsed?.sections || parsed.sections.length === 0) && !parsed?.goalCheck && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
          <h2 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <MdFeedback className="text-teal-600" /> {t.simulator.conversationFeedback}
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{sess.feedback}</div>
        </div>
      )}

      {/* Chat Transcript (Collapsible) */}
      {messages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <MdChat className="text-blue-600" /> {t.simulator.transcript} ({messages.length} {t.simulator.messages})
            </h2>
            <MdArrowBack className={`text-gray-400 transition-transform ${showTranscript ? "rotate-90" : "-rotate-90"}`} />
          </button>
          {showTranscript && (
            <div className="border-t p-4 space-y-2 max-h-[500px] overflow-y-auto bg-gray-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-dotan-green-dark/10 text-gray-800 border border-dotan-green/20"
                      : "bg-white text-gray-800 border border-gray-200 shadow-sm"
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.role === "user"
                        ? <MdPerson className="text-dotan-green text-xs" />
                        : <MdSmartToy className="text-purple-500 text-xs" />
                      }
                      <span className="text-[10px] font-medium text-gray-400">
                        {msg.role === "user" ? t.simulator.you : sess.scenario.machineName}
                      </span>
                      <span className="text-[10px] text-gray-300 mr-auto" dir="ltr">
                        {new Date(msg.timestamp).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
