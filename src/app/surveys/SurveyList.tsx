"use client";

import { MdPoll, MdCheckCircle } from "react-icons/md";
import { Survey, User, getTypeConfig, formatDate } from "./types";
import { useLanguage } from "@/i18n";

interface SurveyListProps {
  surveys: Survey[];
  teamMembers: User[];
  userId: string | null;
  viewScope: "team" | "platoon";
  onSelect: (survey: Survey) => void;
}

export default function SurveyList({ surveys, teamMembers, userId, viewScope, onSelect }: SurveyListProps) {
  const { t, dateLocale } = useLanguage();
  const filtered = surveys.filter((s) => viewScope === "platoon" ? s.team === 0 : s.team !== 0);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MdPoll className="text-5xl mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{viewScope === "platoon" ? t.surveys.noPlatoonSurveys : t.surveys.noTeamSurveys}</p>
        <p className="text-sm mt-1">{t.surveys.createNew}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((survey) => {
        const myResponse = survey.responses.find((r) => r.user.id === userId);
        const typeConfig = getTypeConfig(t);
        const cfg = typeConfig[survey.type] || typeConfig.yes_no;
        const isPlatoon = survey.team === 0;
        return (
          <button key={survey.id} onClick={() => onSelect(survey)}
            className={`w-full text-start bg-white p-4 rounded-xl shadow-sm border-2 hover:shadow-md transition ${
              isPlatoon ? "border-violet-100 hover:border-violet-300" : "border-gray-100 hover:border-dotan-mint"
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                survey.status !== "active" ? "bg-gray-100 text-gray-400"
                  : isPlatoon ? "bg-violet-50 text-violet-500" : "bg-purple-50 text-purple-500"
              }`}>
                <cfg.icon className="text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800 text-sm truncate">{survey.title}</h3>
                  {isPlatoon && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 shrink-0 font-medium">{t.surveys.platoon}</span>
                  )}
                  {survey.status === "closed" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 shrink-0">{t.surveys.closed}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{survey.createdBy.name}</span>
                  <span>•</span>
                  <span>{formatDate(survey.createdAt, dateLocale)}</span>
                  <span>•</span>
                  <span>{survey.responses.length} {t.surveys.responded}</span>
                </div>
              </div>
              <div className="shrink-0">
                {myResponse ? (
                  <MdCheckCircle className="text-green-500 text-xl" />
                ) : survey.status === "active" ? (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">{t.surveys.waiting}</span>
                ) : null}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isPlatoon ? "bg-violet-500" : "bg-dotan-green"}`} style={{ width: `${Math.min((survey.responses.length / Math.max(isPlatoon ? teamMembers.length : teamMembers.filter(m => m.team === survey.team).length, 1)) * 100, 100)}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
