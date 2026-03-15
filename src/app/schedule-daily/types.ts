export interface Assignee {
  id: string;
  userId: string;
  user: { id: string; name: string; image: string | null; team: number | null };
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
  assignees: Assignee[];
}

export interface UserOption {
  id: string;
  name: string;
  image: string | null;
  team: number | null;
}

export interface EventFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  target: string;
  type: string;
}

export interface ScheduleNote {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  visibility: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; team: number | null };
}

export interface TimedGroup {
  startTime: string;
  endTime: string;
  events: { event: ScheduleEvent; idx: number }[];
}
