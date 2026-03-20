"use client";

import { MdAdd, MdSync, MdNotifications } from "react-icons/md";

interface AdminToolbarProps {
  isAdmin: boolean;
  isSagal: boolean;
  canEdit: boolean;
  showAdd: boolean;
  editingEvent: boolean;
  syncing: boolean;
  teamSyncing: boolean;
  teamSyncTarget: number | null;
  userTeam: number | null;
  visibleTeams: Set<number>;
  SYNC_TEAMS: readonly number[];
  onAddClick: () => void;
  onSync: () => void;
  onTeamSync: (team?: number) => void;
  onTeamRemind: (team?: number) => void;
  onToggleTeamVisibility: (team: number) => void;
  onShowAllTeams: () => void;
}

export default function AdminToolbar({
  isAdmin, isSagal, canEdit, showAdd, editingEvent,
  syncing, teamSyncing, teamSyncTarget, userTeam,
  visibleTeams, SYNC_TEAMS,
  onAddClick, onSync, onTeamSync, onTeamRemind,
  onToggleTeamVisibility, onShowAllTeams,
}: AdminToolbarProps) {
  if ((!isAdmin && !isSagal) || showAdd || editingEvent) return null;

  return (
    <>
      {/* Admin / Sagal: Add + Sync + Team toggles */}
      {(isAdmin || isSagal) && (
        <div className="mb-3 space-y-2">
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={onAddClick}
                className="flex-1 bg-dotan-green-dark text-white py-2 rounded-xl hover:bg-dotan-green transition font-medium flex items-center justify-center gap-2 text-sm">
                <MdAdd /> הוסף אירוע
              </button>
              <button onClick={onSync} disabled={syncing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50">
                <MdSync className={syncing ? "animate-spin" : ""} /> {syncing ? "מסנכרן..." : "סנכרון"}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400">הצג צוותים:</span>
            {SYNC_TEAMS.map(t => (
              <button key={t} onClick={() => onToggleTeamVisibility(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  visibleTeams.has(t)
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-teal-300"
                }`}>
                צוות {t}
              </button>
            ))}
            <button onClick={onShowAllTeams}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                visibleTeams.size === SYNC_TEAMS.length
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-teal-300"
              }`}>
              הכל
            </button>
            {canEdit && (
              <>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {SYNC_TEAMS.map(t => (
                  <button key={`sync-${t}`} onClick={() => onTeamSync(t)} disabled={teamSyncing}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition text-[10px] font-medium disabled:opacity-50">
                    <MdSync className={`text-xs ${teamSyncing && teamSyncTarget === t ? "animate-spin" : ""}`} /> {t}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Non-admin team sync + remind (for own team only) */}
      {!isAdmin && (userTeam === 14 || userTeam === 16) && (
        <div className="flex gap-2 mb-3">
          <button onClick={() => onTeamSync()} disabled={teamSyncing}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-teal-200 bg-gradient-to-l from-teal-50 to-cyan-50 text-teal-700 hover:from-teal-100 hover:to-cyan-100 transition text-sm font-medium disabled:opacity-50">
            <MdSync className={teamSyncing ? "animate-spin" : ""} /> {teamSyncing ? "מסנכרן צוות..." : `סנכרון לו"ז צוות ${userTeam}`}
          </button>
          <button onClick={() => onTeamRemind()} disabled={teamSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-600 hover:bg-teal-50 transition text-sm font-medium disabled:opacity-50">
            <MdNotifications /> תזכורת לצוות
          </button>
        </div>
      )}
    </>
  );
}
