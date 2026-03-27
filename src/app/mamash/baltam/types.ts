import type { ScheduleEvent, TeamMember, BaltamAction } from "../types";

export interface BaltamSheetProps {
  event: ScheduleEvent;
  teamMembers: TeamMember[];
  allEvents: ScheduleEvent[];
  onClose: () => void;
  onAction: (action: BaltamAction, payload: Record<string, unknown>) => Promise<{ ok: boolean; cascadeConflicts?: unknown[]; teamCollisions?: unknown[] }>;
  acting: boolean;
  date: string;
}

export interface CollisionResolution {
  type: "shift-forward" | "trim-start" | "swap-times";
  label: string;
  newStartTime: string;
  newEndTime: string;
}

export interface TeamCollision {
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  assignees: { id: string; name: string }[];
  overlapMinutes: number;
  resolutions: CollisionResolution[];
}

export type ActionScreen = null | "reschedule" | "cancel" | "swap" | "reassign" | "shorten" | "extend" | "delay" | "split" | "duplicate";
