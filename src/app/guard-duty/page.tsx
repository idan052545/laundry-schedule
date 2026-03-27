"use client";

import {
  MdSecurity, MdAdd, MdClose, MdDownload, MdDelete, MdRefresh,
  MdBarChart, MdNotifications, MdErrorOutline, MdGavel, MdPerson,
  MdAutoAwesome, MdCalendarMonth, MdFileDownload, MdRestaurant,
} from "react-icons/md";
import { InlineLoading } from "@/components/LoadingScreen";
import { useLanguage } from "@/i18n";
import { ROLE_COLORS } from "./constants";
import { useGuardDuty } from "./useGuardDuty";
import CreateForm from "./CreateForm";
import FairnessPanel from "./FairnessPanel";
import OverlapsPanel from "./OverlapsPanel";
import AppealsPanel from "./AppealsPanel";
import DutyTableView from "./DutyTable";
import KitchenTableView from "./KitchenTableView";
import SwapModal from "./SwapModal";
import AppealModal from "./AppealModal";
import PersonSummary from "./PersonSummary";
import DatePickerCalendar from "./DatePickerCalendar";
import AutoFillPreview from "./AutoFillPreview";

export default function GuardDutyPage() {
  const { t } = useLanguage();
  const g = useGuardDuty();

  if (g.authStatus === "loading" || g.loading) return <InlineLoading />;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-dotan-green-dark flex items-center gap-2 shrink-0">
          <MdSecurity className="text-amber-600" /> {t.guardDuty.title}
        </h1>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
          <button onClick={() => g.fetchData()}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-dotan-green hover:bg-gray-50 text-xs font-medium">
            <MdRefresh className={g.loading ? "animate-spin" : ""} />
          </button>
          {g.isRoni && g.table && (
            <button onClick={g.handleExportXlsx}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium">
              <MdDownload className="text-green-600" /> <span className="hidden sm:inline">XLSX</span>
            </button>
          )}
          {(g.isCreator || g.isRoni) && g.table && (
            <button onClick={g.handleDeleteTable}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium">
              <MdDelete />
            </button>
          )}
        </div>
      </div>

      {/* Day type toggle (Roni only) */}
      {g.isRoni && (
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-2">
          <button onClick={() => g.handleToggleDayType("duty")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${g.dayType === "duty" ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
            <MdSecurity className="text-sm" /> {t.guardDuty.dayTypeDuty}
          </button>
          <button onClick={() => g.handleToggleDayType("kitchen")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${g.dayType === "kitchen" ? "bg-white text-orange-700 shadow-sm" : "text-gray-500"}`}>
            <MdRestaurant className="text-sm" /> {t.guardDuty.dayTypeKitchen}
          </button>
        </div>
      )}

      {/* Type tabs — duty day: guard/obs, kitchen day: kitchen only */}
      {g.dayType === "duty" ? (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
          <button onClick={() => g.setTableType("guard")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${g.tableType === "guard" ? "bg-white text-dotan-green-dark shadow-sm" : "text-gray-500"}`}>
            {t.guardDuty.guards}
          </button>
          <button onClick={() => g.setTableType("obs")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${g.tableType === "obs" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500"}`}>
            {t.guardDuty.avs}
          </button>
        </div>
      ) : (
        <div className="flex gap-1 bg-orange-100 rounded-xl p-1 mb-3">
          <div className="flex-1 py-2 px-4 rounded-lg text-sm font-bold bg-white text-orange-700 shadow-sm text-center flex items-center justify-center gap-1.5">
            <MdRestaurant /> {t.guardDuty.kitchen}
          </div>
        </div>
      )}

      {/* Date selector — inline compact bar with calendar toggle */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 mb-3">
        <button onClick={() => g.setShowCalendar(!g.showCalendar)}
          className={`p-1.5 rounded-lg transition ${g.showCalendar ? "bg-dotan-green-dark text-white" : "text-gray-400 hover:bg-gray-100"}`}>
          <MdCalendarMonth className="text-lg" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-bold text-gray-700">{g.dateDisplay}</span>
          {g.availableDates.includes(g.date) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-dotan-green ms-1 align-middle" />}
        </div>
        <input type="date" value={g.date} onChange={e => g.setDate(e.target.value)}
          className="text-[10px] text-gray-400 bg-transparent border-none outline-none cursor-pointer w-24" />
      </div>

      {/* Calendar date picker */}
      {g.showCalendar && (
        <DatePickerCalendar
          selectedDate={g.date}
          onSelectDate={(d) => { g.setDate(d); g.setShowCalendar(false); }}
          availableDates={g.availableDates}
          tableType={g.tableType}
        />
      )}

      {/* Roni quick actions */}
      {g.isRoni && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {/* Auto-fill button — the star feature */}
          <button onClick={g.handleAutoFill} disabled={g.submitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 bg-gradient-to-l from-indigo-500 to-purple-600 text-white border-indigo-300 hover:from-indigo-600 hover:to-purple-700 transition shadow-md disabled:opacity-50">
            <MdAutoAwesome className="text-sm" /> {t.guardDuty.autoFill}
          </button>

          <button onClick={() => g.showCreate ? g.setShowCreate(false) : g.initCreateForm()}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-dotan-green-dark text-white text-xs font-medium hover:bg-dotan-green transition">
            {g.showCreate ? <><MdClose /> {t.common.close}</> : <><MdAdd /> {t.guardDuty.newTable}</>}
          </button>

          <button onClick={() => g.setShowFairness(!g.showFairness)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${g.showFairness ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <MdBarChart /> {t.guardDuty.fairness}
          </button>

          {g.table && (
            <button onClick={g.handleNotifyAll} disabled={g.submitting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border bg-dotan-green-dark text-white hover:bg-dotan-green transition disabled:opacity-50">
              <MdNotifications /> {g.submitting ? t.guardDuty.sending : t.guardDuty.sendAssignments}
            </button>
          )}

          <button onClick={() => g.setShowOverlaps(!g.showOverlaps)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${g.showOverlaps ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <MdErrorOutline /> {t.guardDuty.overlaps}
            {g.overlaps.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{g.overlaps.length}</span>}
          </button>

          {/* Export all */}
          <button onClick={g.handleExportAllXlsx}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            <MdFileDownload className="text-green-600" /> {t.guardDuty.exportAll}
          </button>

          {g.appeals.filter(a => a.status === "pending").length > 0 && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600">
              <MdGavel /> {g.appeals.filter(a => a.status === "pending").length} {t.guardDuty.pendingDisputes}
            </span>
          )}
        </div>
      )}

      {/* Auto-fill preview */}
      {g.autoFillPreview && g.isRoni && (
        <AutoFillPreview
          tables={g.autoFillPreview}
          allUsers={g.allUsers}
          submitting={g.submitting}
          obsGdudi={g.autoFillObsGdudi}
          onApply={g.handleApplyAutoFill}
          onCancel={() => g.setAutoFillPreview(null)}
          onEditAssignment={g.handleEditAutoFillAssignment}
        />
      )}

      {/* Create form */}
      {g.showCreate && g.isRoni && (
        <CreateForm
          table={!!g.table}
          createTitle={g.createTitle}
          setCreateTitle={g.setCreateTitle}
          createRoles={g.createRoles}
          createSlots={g.createSlots}
          createAssignments={g.createAssignments}
          setAssignment={g.setAssignment}
          allUsers={g.allUsers}
          submitting={g.submitting}
          onClose={() => g.setShowCreate(false)}
          onSubmit={g.handleCreate}
        />
      )}

      {/* Fairness panel */}
      {g.showFairness && g.isRoni && (
        <FairnessPanel fairnessData={g.fairnessData} avgHours={g.avgHours} />
      )}

      {/* Overlaps panel */}
      {g.showOverlaps && g.isRoni && (
        <OverlapsPanel overlaps={g.overlaps} otherTable={g.otherTable} tableType={g.tableType} />
      )}

      {/* Pending appeals */}
      {g.isRoni && (
        <AppealsPanel appeals={g.appeals} submitting={g.submitting} onResolve={g.handleResolveAppeal} />
      )}

      {/* No table */}
      {!g.table && !g.showCreate && !g.autoFillPreview && (
        <div className="text-center py-16 text-gray-400">
          <MdSecurity className="text-5xl mx-auto mb-3 text-gray-300" />
          <p className="font-medium">{t.guardDuty.noAssignment}</p>
          {g.isRoni && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">{t.guardDuty.createTable}</p>
              <button onClick={g.handleAutoFill} disabled={g.submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-l from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition shadow-md disabled:opacity-50">
                <MdAutoAwesome /> {t.guardDuty.autoFill}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main table */}
      {g.table && (
        <>
          {g.dayType === "kitchen" ? (
            <KitchenTableView
              table={g.table}
              dateDisplay={g.dateDisplay}
              userId={g.userId}
              isRoni={g.isRoni}
              onSwap={(a) => { g.setSwapping(a); g.setSwapUserId(""); }}
              onExport={g.handleExportXlsx}
            />
          ) : (
            <DutyTableView
              table={g.table}
              roles={g.roles}
              slots={g.slots}
              dayRoleAssignments={g.dayRoleAssignments}
              squads={g.squads}
              obsGdudi={g.obsGdudi}
              dateDisplay={g.dateDisplay}
              userId={g.userId}
              isRoni={g.isRoni}
              onSwap={(a) => { g.setSwapping(a); g.setSwapUserId(""); }}
              onAppeal={(a) => { g.setAppealing(a); g.setAppealReason(""); g.setAppealSuggestion(""); }}
              onExport={g.handleExportXlsx}
            />
          )}

          {/* My assignments card */}
          {g.myAssignments.length > 0 && (
            <div className="bg-dotan-mint-light border-2 border-dotan-green rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-dotan-green-dark text-sm mb-2 flex items-center gap-2">
                <MdPerson /> {t.guardDuty.myAssignments} ({g.getPersonHours(g.userId!).toFixed(1)} {t.guardDuty.hours})
              </h3>
              <div className="space-y-1.5">
                {g.myAssignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-dotan-mint">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${ROLE_COLORS[a.role] || "bg-gray-600"}`}>{a.role}</span>
                      <span className="text-xs font-medium text-gray-600">{a.timeSlot}</span>
                    </div>
                    <button onClick={() => { g.setAppealing(a); g.setAppealReason(""); g.setAppealSuggestion(""); }}
                      className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 font-medium flex items-center gap-1">
                      <MdGavel /> {t.guardDuty.dispute}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Person summary */}
          <PersonSummary
            assignedPeople={g.assignedPeople}
            hoursMap={g.hoursMap}
            getPersonAssignments={g.getPersonAssignments}
            getPersonHours={g.getPersonHours}
            showPersonSummary={g.showPersonSummary}
            setShowPersonSummary={g.setShowPersonSummary}
            isRoni={g.isRoni}
            onSwap={(a) => { g.setSwapping(a); g.setSwapUserId(""); }}
          />
        </>
      )}

      {/* Swap modal */}
      {g.swapping && (
        <SwapModal
          swapping={g.swapping}
          swapUserId={g.swapUserId}
          setSwapUserId={g.setSwapUserId}
          allUsers={g.allUsers}
          submitting={g.submitting}
          onClose={() => g.setSwapping(null)}
          onSwap={g.handleSwap}
        />
      )}

      {/* Appeal modal */}
      {g.appealing && (
        <AppealModal
          appealing={g.appealing}
          appealReason={g.appealReason}
          setAppealReason={g.setAppealReason}
          appealSuggestion={g.appealSuggestion}
          setAppealSuggestion={g.setAppealSuggestion}
          allUsers={g.allUsers}
          userId={g.userId}
          submitting={g.submitting}
          onClose={() => g.setAppealing(null)}
          onAppeal={g.handleAppeal}
        />
      )}
    </div>
  );
}
