"use client";

import { useSession } from "next-auth/react";
import { useLanguage } from "@/i18n";
import { useGuardDutyState } from "./useGuardDutyState";
import { useGuardDutyFetch } from "./useGuardDutyFetch";
import { useGuardDutyActions } from "./useGuardDutyActions";
import { useGuardDutyAutoFill } from "./useGuardDutyAutoFill";
import { useGuardDutyExport } from "./useGuardDutyExport";
import { useGuardDutyDerived } from "./useGuardDutyDerived";

export function useGuardDuty() {
  const { data: session, status: authStatus } = useSession();
  const { t, dateLocale } = useLanguage();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const state = useGuardDutyState();
  const { fetchData, changeDate } = useGuardDutyFetch(state, authStatus);
  const actions = useGuardDutyActions(state, fetchData, t);
  const autoFill = useGuardDutyAutoFill(state, fetchData, t);
  const exportFns = useGuardDutyExport(state, t);
  const derived = useGuardDutyDerived(state, userId, t, dateLocale);

  return {
    // Auth
    authStatus, userId,
    // Data
    table: state.table, allUsers: state.allUsers, isRoni: state.isRoni,
    isCreator: state.isCreator, appeals: state.appeals, hoursMap: state.hoursMap,
    availableDates: state.availableDates,
    ...derived,
    // UI state
    date: state.date, tableType: state.tableType, setTableType: state.setTableType,
    dayType: state.dayType, loading: state.loading,
    showCreate: state.showCreate, setShowCreate: state.setShowCreate,
    showPersonSummary: state.showPersonSummary, setShowPersonSummary: state.setShowPersonSummary,
    showFairness: state.showFairness, setShowFairness: state.setShowFairness,
    showOverlaps: state.showOverlaps, setShowOverlaps: state.setShowOverlaps,
    swapping: state.swapping, setSwapping: state.setSwapping,
    swapUserId: state.swapUserId, setSwapUserId: state.setSwapUserId,
    appealing: state.appealing, setAppealing: state.setAppealing,
    appealReason: state.appealReason, setAppealReason: state.setAppealReason,
    appealSuggestion: state.appealSuggestion, setAppealSuggestion: state.setAppealSuggestion,
    submitting: state.submitting,
    showCalendar: state.showCalendar, setShowCalendar: state.setShowCalendar,
    // Create form
    createTitle: state.createTitle, setCreateTitle: state.setCreateTitle,
    createRoles: state.createRoles, createSlots: state.createSlots,
    createAssignments: state.createAssignments,
    // Auto-fill
    autoFillPreview: state.autoFillPreview, setAutoFillPreview: state.setAutoFillPreview,
    autoFillObsGdudi: state.autoFillObsGdudi,
    // Actions
    changeDate, ...actions, ...autoFill, ...exportFns,
    // Helpers
    otherTable: state.otherTable, setDate: state.setDate, fetchData,
  };
}
