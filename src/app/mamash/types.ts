export interface TeamMember {
  id: string;
  name: string;
  nameEn: string | null;
  image: string | null;
  team: number | null;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  target: string;
  type: string;
  assignees: { id: string; userId: string; user: TeamMember }[];
}

export type SlotStatus = "available" | "assigned" | "platoon-blocked" | "duty" | "leave";

export interface AvailabilitySlot {
  time: string; // HH:MM
  status: SlotStatus;
  eventTitle?: string;
}

export interface MemberAvailability {
  user: TeamMember;
  slots: AvailabilitySlot[];
}

export interface FreeSlot {
  start: string; // HH:MM
  end: string;
  durationMin: number;
}

export interface Requirement {
  id: string;
  team: number;
  weekStart: string;
  type: string;
  title: string;
  description: string | null;
  targetUserId: string | null;
  targetUser: TeamMember | null;
  duration: number;
  priority: string;
  status: string;
  linkedEventId: string | null;
  scheduledDate: string | null;
  createdById: string;
  createdAt: string;
}

export interface ChangeEntry {
  id: string;
  eventId: string | null;
  team: number;
  date: string;
  changeType: string;
  description: string;
  previousData: string | null;
  newData: string | null;
  reason: string | null;
  affectedUserIds: string | null;
  createdBy: { id: string; name: string; image: string | null };
  createdAt: string;
}

export interface MamashOverview {
  events: ScheduleEvent[];
  teamMembers: TeamMember[];
  availability: MemberAvailability[];
  freeSlots: FreeSlot[];
  requirements: Requirement[];
  changelog: ChangeEntry[];
  activeMamash: { id: string; userId: string; user: TeamMember } | null;
}

export type RequirementType =
  | "status-meeting"
  | "plan-approval"
  | "simulation"
  | "feedback"
  | "morning-talk"
  | "ted-debrief"
  | "experience-download"
  | "scenario"
  | "team-assessment"
  | "mamash-time"
  | "hot-debrief"
  | "checkpoint"
  | "custom";

export type BaltamAction = "reschedule" | "cancel" | "swap" | "reassign";
