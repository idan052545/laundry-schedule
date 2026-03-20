import {
  MdRestaurant, MdCleaningServices, MdSecurity, MdLocalShipping,
  MdMoreHoriz, MdVolunteerActivism, MdLightbulb, MdThumbUp, MdChat,
} from "react-icons/md";

export const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof MdRestaurant; color: string; bg: string; border: string }> = {
  kitchen: { label: "מטבח", icon: MdRestaurant, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  cleaning: { label: "ניקיון", icon: MdCleaningServices, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  guard: { label: "שמירה", icon: MdSecurity, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  logistics: { label: "לוגיסטיקה", icon: MdLocalShipping, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  other: { label: "אחר", icon: MdMoreHoriz, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  general: { label: "כללי", icon: MdVolunteerActivism, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "פתוח", color: "text-green-700", bg: "bg-green-100" },
  filled: { label: "מלא", color: "text-blue-700", bg: "bg-blue-100" },
  "in-progress": { label: "בביצוע", color: "text-amber-700", bg: "bg-amber-100" },
  completed: { label: "הושלם", color: "text-gray-600", bg: "bg-gray-100" },
  cancelled: { label: "בוטל", color: "text-red-600", bg: "bg-red-100" },
};

export const TEAM_COLORS: Record<number, string> = {
  14: "bg-blue-100 text-blue-700 border-blue-200",
  15: "bg-emerald-100 text-emerald-700 border-emerald-200",
  16: "bg-purple-100 text-purple-700 border-purple-200",
  17: "bg-amber-100 text-amber-700 border-amber-200",
  0: "bg-gray-100 text-gray-700 border-gray-200",
};

export const FEEDBACK_TYPES = [
  { value: "improvement", label: "שיפור", icon: MdLightbulb },
  { value: "preserve", label: "שימור", icon: MdThumbUp },
  { value: "vent", label: "לפרוק", icon: MdChat },
];
