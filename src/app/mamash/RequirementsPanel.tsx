"use client";

import { useState } from "react";
import { MdAdd, MdClose, MdCheck, MdDelete, MdSchedule } from "react-icons/md";
import { useLanguage } from "@/i18n";
import type { Requirement, TeamMember, RequirementType } from "./types";
import { REQ_TYPE_CONFIG } from "./constants";

interface Props {
  requirements: Requirement[];
  teamMembers: TeamMember[];
  onAdd: (req: { type: string; title: string; description?: string; targetUserId?: string; duration?: number; priority?: string }) => Promise<Requirement | null>;
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  acting: boolean;
}

export default function RequirementsPanel({ requirements, teamMembers, onAdd, onUpdate, onDelete, acting }: Props) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<RequirementType>("status-meeting");
  const [formTitle, setFormTitle] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDuration, setFormDuration] = useState(10);
  const [formPriority, setFormPriority] = useState("normal");

  const pending = requirements.filter(r => r.status === "pending");
  const scheduled = requirements.filter(r => r.status === "scheduled");
  const completed = requirements.filter(r => r.status === "completed");

  async function handleSubmit() {
    const config = REQ_TYPE_CONFIG[formType];
    const title = formTitle || t.mamash.reqTypes[formType as keyof typeof t.mamash.reqTypes] || formType;
    const targetUser = formTarget ? teamMembers.find(m => m.id === formTarget) : null;
    const fullTitle = targetUser ? `${title} — ${targetUser.name}` : title;

    await onAdd({
      type: formType,
      title: fullTitle,
      targetUserId: formTarget || undefined,
      duration: formDuration || config.defaultDuration,
      priority: formPriority,
    });

    setShowForm(false);
    setFormTitle("");
    setFormTarget("");
    setFormDuration(10);
    setFormPriority("normal");
  }

  function selectType(type: RequirementType) {
    setFormType(type);
    setFormDuration(REQ_TYPE_CONFIG[type].defaultDuration);
    setFormTitle("");
  }

  return (
    <div className="p-3">
      {/* Add button */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-dotan-green/10 text-dotan-green-dark rounded-xl text-xs font-bold hover:bg-dotan-green/20 transition mb-3"
      >
        <MdAdd /> {t.mamash.addRequirement}
      </button>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-2">{t.mamash.pendingReqs} ({pending.length})</h3>
          <div className="space-y-1.5">
            {pending.map(req => (
              <RequirementCard key={req.id} req={req} onUpdate={onUpdate} onDelete={onDelete} acting={acting} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-blue-500 uppercase mb-2">{t.mamash.scheduledReqs} ({scheduled.length})</h3>
          <div className="space-y-1.5">
            {scheduled.map(req => (
              <RequirementCard key={req.id} req={req} onUpdate={onUpdate} onDelete={onDelete} acting={acting} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-green-500 uppercase mb-2">{t.mamash.completedReqs} ({completed.length})</h3>
          <div className="space-y-1.5 opacity-60">
            {completed.map(req => (
              <RequirementCard key={req.id} req={req} onUpdate={onUpdate} onDelete={onDelete} acting={acting} t={t} />
            ))}
          </div>
        </div>
      )}

      {requirements.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">{t.mamash.noRequirements}</div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">{t.mamash.addRequirement}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <MdClose />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {(Object.keys(REQ_TYPE_CONFIG) as RequirementType[]).map(type => {
                const config = REQ_TYPE_CONFIG[type];
                const Icon = config.icon;
                const isActive = formType === type;
                return (
                  <button
                    key={type}
                    onClick={() => selectType(type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition text-center ${
                      isActive ? `${config.bg} border-current ${config.color}` : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="text-base" />
                    <span className="text-[9px] font-bold leading-tight">
                      {t.mamash.reqTypes[type as keyof typeof t.mamash.reqTypes] || type}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Target user */}
            <label className="block mb-3">
              <span className="text-[10px] text-gray-500 font-bold">{t.mamash.targetPerson}</span>
              <select
                value={formTarget}
                onChange={e => setFormTarget(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
              >
                <option value="">{t.mamash.noSpecificPerson}</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>

            {/* Custom title (for custom type) */}
            {formType === "custom" && (
              <label className="block mb-3">
                <span className="text-[10px] text-gray-500 font-bold">{t.mamash.reqTitle}</span>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
                  placeholder={t.mamash.reqTitlePlaceholder}
                />
              </label>
            )}

            {/* Duration */}
            <label className="block mb-3">
              <span className="text-[10px] text-gray-500 font-bold">{t.mamash.duration}</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  value={formDuration}
                  onChange={e => setFormDuration(Number(e.target.value))}
                  min={5}
                  max={120}
                  step={5}
                  className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-center"
                />
                <span className="text-[10px] text-gray-500">{t.mamash.minutes}</span>
              </div>
            </label>

            {/* Priority */}
            <label className="block mb-4">
              <span className="text-[10px] text-gray-500 font-bold">{t.mamash.priority}</span>
              <div className="flex gap-1.5 mt-1">
                {["low", "normal", "high", "urgent"].map(p => (
                  <button
                    key={p}
                    onClick={() => setFormPriority(p)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition ${
                      formPriority === p
                        ? p === "urgent" ? "bg-red-50 border-red-300 text-red-600"
                          : p === "high" ? "bg-orange-50 border-orange-300 text-orange-600"
                          : p === "low" ? "bg-gray-50 border-gray-300 text-gray-500"
                          : "bg-blue-50 border-blue-300 text-blue-600"
                        : "bg-white border-gray-200 text-gray-400"
                    }`}
                  >
                    {t.mamash.priorities[p as keyof typeof t.mamash.priorities]}
                  </button>
                ))}
              </div>
            </label>

            <button
              onClick={handleSubmit}
              disabled={acting || (formType === "custom" && !formTitle)}
              className="w-full py-2.5 bg-dotan-green text-white rounded-xl text-xs font-bold hover:bg-dotan-green-dark transition disabled:opacity-50"
            >
              {t.mamash.addRequirement}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RequirementCard({ req, onUpdate, onDelete, acting, t }: { req: Requirement; onUpdate: any; onDelete: any; acting: boolean; t: any }) {
  const config = REQ_TYPE_CONFIG[req.type as RequirementType] || REQ_TYPE_CONFIG.custom;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition ${
      req.status === "pending" ? "bg-white border-gray-200" :
      req.status === "scheduled" ? "bg-blue-50/50 border-blue-200" :
      "bg-green-50/50 border-green-200"
    }`}>
      <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`text-sm ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-gray-800 truncate block">{req.title}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <MdSchedule className="text-[10px]" /> {req.duration} {t.mamash.minutes}
          </span>
          {req.targetUser && (
            <span className="text-[10px] text-gray-400">· {req.targetUser.name.split(" ")[0]}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {req.status === "pending" && (
          <button
            onClick={() => onUpdate(req.id, { status: "completed" })}
            disabled={acting}
            className="p-1 rounded hover:bg-green-100 text-green-500"
          >
            <MdCheck className="text-sm" />
          </button>
        )}
        {req.status !== "completed" && (
          <button
            onClick={() => onDelete(req.id)}
            disabled={acting}
            className="p-1 rounded hover:bg-red-100 text-red-400"
          >
            <MdDelete className="text-sm" />
          </button>
        )}
      </div>
    </div>
  );
}
