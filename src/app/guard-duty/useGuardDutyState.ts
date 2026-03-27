"use client";

import { useState } from "react";
import { DutyTable, UserMin, Appeal, Assignment, toDateStr } from "./constants";

export function useGuardDutyState() {
  const [date, setDate] = useState(toDateStr(new Date()));
  const [tableType, setTableType] = useState<"guard" | "obs" | "kitchen">("guard");
  const [dayType, setDayType] = useState<"duty" | "kitchen">("duty");
  const [table, setTable] = useState<DutyTable | null>(null);
  const [allUsers, setAllUsers] = useState<UserMin[]>([]);
  const [isRoni, setIsRoni] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [initialDateSet, setInitialDateSet] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showPersonSummary, setShowPersonSummary] = useState<string | null>(null);
  const [showFairness, setShowFairness] = useState(false);
  const [showOverlaps, setShowOverlaps] = useState(false);
  const [otherTable, setOtherTable] = useState<DutyTable | null>(null);
  const [swapping, setSwapping] = useState<Assignment | null>(null);
  const [swapUserId, setSwapUserId] = useState("");
  const [appealing, setAppealing] = useState<Assignment | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealSuggestion, setAppealSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createTitle, setCreateTitle] = useState("");
  const [createRoles, setCreateRoles] = useState<string[]>([]);
  const [createSlots, setCreateSlots] = useState<string[]>([]);
  const [createAssignments, setCreateAssignments] = useState<Record<string, Record<string, string>>>({});

  // Auto-fill
  const [autoFillPreview, setAutoFillPreview] = useState<Record<string, {
    title: string; roles: string[]; timeSlots: string[];
    assignments: { userId: string; timeSlot: string; role: string; note?: string }[];
    stats: { totalHours: number; usersUsed: number; fairnessScore: number };
  }> | null>(null);
  const [autoFillObsGdudi, setAutoFillObsGdudi] = useState<{ userId: string; name: string; team: number; obsShift?: string }[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  return {
    date, setDate,
    tableType, setTableType,
    dayType, setDayType,
    table, setTable,
    allUsers, setAllUsers,
    isRoni, setIsRoni,
    isCreator, setIsCreator,
    appeals, setAppeals,
    hoursMap, setHoursMap,
    availableDates, setAvailableDates,
    initialDateSet, setInitialDateSet,
    loading, setLoading,
    showCreate, setShowCreate,
    showPersonSummary, setShowPersonSummary,
    showFairness, setShowFairness,
    showOverlaps, setShowOverlaps,
    otherTable, setOtherTable,
    swapping, setSwapping,
    swapUserId, setSwapUserId,
    appealing, setAppealing,
    appealReason, setAppealReason,
    appealSuggestion, setAppealSuggestion,
    submitting, setSubmitting,
    createTitle, setCreateTitle,
    createRoles, setCreateRoles,
    createSlots, setCreateSlots,
    createAssignments, setCreateAssignments,
    autoFillPreview, setAutoFillPreview,
    autoFillObsGdudi, setAutoFillObsGdudi,
    showCalendar, setShowCalendar,
  };
}

export type GuardDutyState = ReturnType<typeof useGuardDutyState>;
