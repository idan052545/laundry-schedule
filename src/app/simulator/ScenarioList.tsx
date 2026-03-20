"use client";

import { useState } from "react";
import {
  MdSmartToy, MdHistory, MdAdd, MdEdit, MdDelete,
  MdChat, MdRecordVoiceOver, MdCheckCircle,
} from "react-icons/md";
import { Scenario, SimSession } from "./types";

export function ScenarioList({ scenarios, sessions, isAdmin, onSelect, onStart, onCreate, onEdit, onDelete, onHistory, onViewFeedback }: {
  scenarios: Scenario[];
  sessions: SimSession[];
  isAdmin: boolean;
  onSelect: (s: Scenario) => void;
  onStart: (s: Scenario, mode: "chat" | "voice") => void;
  onCreate: () => void;
  onEdit: (s: Scenario) => void;
  onDelete: (id: string) => void;
  onHistory: () => void;
  onViewFeedback: (s: SimSession) => void;
}) {
  const [startingId, setStartingId] = useState<string | null>(null);
  const recentCompleted = sessions.filter(s => s.status === "completed").slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dotan-green-dark flex items-center gap-2">
          <MdSmartToy className="text-dotan-gold" />
          סימולטור פיקודי
        </h1>
        <div className="flex gap-2">
          <button onClick={onHistory} className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1 text-gray-600">
            <MdHistory /> היסטוריה
          </button>
          {isAdmin && (
            <button onClick={onCreate} className="bg-dotan-green-dark text-white px-4 py-2 rounded-lg hover:bg-dotan-green transition font-medium flex items-center gap-1 text-sm">
              <MdAdd /> תרחיש חדש
            </button>
          )}
        </div>
      </div>

      {/* Recent completed */}
      {recentCompleted.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><MdCheckCircle className="text-green-500" /> סימולציות אחרונות</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentCompleted.map(sess => (
              <button key={sess.id} onClick={() => onViewFeedback(sess)}
                className="shrink-0 bg-white border border-gray-200 rounded-xl p-3 hover:border-dotan-green transition text-right min-w-[200px]">
                <div className="text-sm font-bold text-gray-800 truncate">{sess.scenario.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  {sess.score !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${sess.score >= 70 ? "bg-green-50 text-green-600" : sess.score >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                      {sess.score}/100
                    </span>
                  )}
                  {sess.grade && <span className="text-xs text-gray-500">{sess.grade}</span>}
                  <span className="text-[10px] text-gray-400">{sess.mode === "voice" ? "קולי" : "צ׳אט"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scenario cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {scenarios.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:border-dotan-gold transition p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-base truncate">{s.title}</h3>
                {s.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>}
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(s)} className="text-gray-400 hover:text-gray-600 p-1"><MdEdit /></button>
                  <button onClick={() => onDelete(s.id)} className="text-red-300 hover:text-red-500 p-1"><MdDelete /></button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
              <span className="bg-dotan-mint-light text-dotan-green-dark px-2 py-0.5 rounded-full">{s.machineName}</span>
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">קושי: {s.difficulty}/10</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s.soldierGender === "male" ? "זכר" : "נקבה"}</span>
              {!s.active && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full">לא פעיל</span>}
            </div>

            <div className="text-xs text-gray-500 mb-3 space-y-0.5">
              <div><strong>דמות:</strong> {s.conflictCharacter}</div>
              <div><strong>מטרה:</strong> {s.objective}</div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={startingId === s.id}
                onClick={() => { setStartingId(s.id); onStart(s, "chat"); }}
                className="flex-1 bg-dotan-green-dark text-white py-2.5 rounded-lg hover:bg-dotan-green transition font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                <MdChat /> צ׳אט
              </button>
              <button
                disabled={startingId === s.id}
                onClick={() => { setStartingId(s.id); onStart(s, "voice"); }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg hover:opacity-90 transition font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                <MdRecordVoiceOver /> קולי
              </button>
            </div>
          </div>
        ))}
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <MdSmartToy className="text-6xl mx-auto mb-4 text-gray-300" />
          <p className="text-lg">אין תרחישים עדיין</p>
          <p className="text-sm mt-1">צור תרחיש חדש כדי להתחיל</p>
        </div>
      )}
    </div>
  );
}
