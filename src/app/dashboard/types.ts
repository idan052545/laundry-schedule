import {
  MdRestaurant, MdCleaningServices, MdSecurity, MdLocalShipping,
  MdVolunteerActivism, MdMoreHoriz,
} from "react-icons/md";

export interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
  bookings: {
    id: string;
    date: string;
    timeSlot: string;
    user: { id: string; name: string; image: string | null };
  }[];
}

export interface DashboardFeed {
  latestMessage: { id: string; title: string; createdAt: string; author: { name: string } } | null;
  pinnedPosts: { id: string; title: string; type: string; dueDate: string | null; author: { name: string } }[];
  todayTasks: { id: string; title: string; startDate: string; category: string; priority: string; dueDate: string | null; status: string }[];
  pendingForms: { id: string; title: string; deadline: string | null }[];
  birthdayUsers: { id: string; name: string; image: string | null }[];
  unreadMaterials: { id: string; title: string; createdAt: string; author: { name: string } }[];
  currentSchedule: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; assignees: { id: string }[]; status: "now" | "next" } | null;
  scheduleItems: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; assignees: { id: string }[]; status: "now" | "next" }[];
  allDaySchedule: { id: string; title: string; type: string; target: string; assignees: { id: string }[] }[];
  myTeamAssignments: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; allDay: boolean }[];
  myAssignedSchedule: { id: string; title: string; startTime: string; endTime: string; type: string; target: string; allDay: boolean }[];
  pendingSurveys: { id: string; title: string; createdAt: string }[];
  pendingPlatoonSurveys: { id: string; title: string; createdAt: string }[];
  platoonSurveyCommanderId: string | null;
  hasVotedThisWeek: boolean;
  dailyQuote: { id: string; text: string; date: string; user: { name: string; team: number | null } } | null;
  todayNotes: { id: string; title: string; startTime: string | null; visibility: string; user: { id: string; name: string } }[];
  nextDutyTables: {
    id: string;
    title: string;
    date: string;
    type: string;
    dateStatus: "today" | "upcoming" | "recent";
    totalAssigned: number;
    myAssignments: { role: string; timeSlot: string; note?: string; partners: string[] }[];
  }[];
  chopalStatus: { registered: boolean; isOpen: boolean; date: string; assignment: { id: string; assignedTime: string; status: string } | null };
  activeVolunteerRequests: { id: string; title: string; category: string; priority: string; status: string; target: string; requiredCount: number; startTime: string; endTime: string; isCommanderRequest: boolean; createdBy: { name: string; phone: string | null }; _count: { assignments: number } }[];
  myVolunteerAssignments: { id: string; status: string; request: { id: string; title: string; startTime: string; endTime: string; category: string; location?: string | null; assignments?: { userId: string; user: { id: string; name: string; nameEn?: string | null; image?: string | null } }[] }; overlappingSchedule?: { id: string; title: string; startTime: string; endTime: string; type: string }[] }[];
  myCreatedRequests: { id: string; title: string; category: string; status: string; startTime: string; endTime: string; requiredCount: number; location?: string | null; assignments?: { userId: string; assignmentType: string; user: { id: string; name: string; nameEn?: string | null; image?: string | null } }[]; _count: { assignments: number } }[];
  urgentReplacement: { id: string; isUrgent: boolean; request: { id: string; title: string } } | null;
}

export type SectionKey = "quote" | "schedule" | "duty" | "teamSchedule" | "mySchedule" | "notes" | "tasks" | "forms" | "surveys" | "birthdays" | "messages" | "materials" | "commander" | "vote" | "machines" | "chopal" | "volunteers";

export type DashStyle = "new" | "classic" | "carousel";

export interface Notification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  tag: string | null;
  read: boolean;
  createdAt: string;
}

export const CAT_ICONS: Record<string, typeof MdRestaurant> = {
  kitchen: MdRestaurant,
  cleaning: MdCleaningServices,
  guard: MdSecurity,
  logistics: MdLocalShipping,
  general: MdVolunteerActivism,
  other: MdMoreHoriz,
};

export const CAT_COLORS: Record<string, string> = {
  kitchen: "text-orange-500",
  cleaning: "text-blue-500",
  guard: "text-red-500",
  logistics: "text-purple-500",
  general: "text-green-500",
  other: "text-gray-400",
};
