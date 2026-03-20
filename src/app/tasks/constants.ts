import {
  MdAssignment, MdWarning, MdNotifications, MdCalendarToday, MdAccessTime,
} from "react-icons/md";

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof MdAssignment }> = {
  deadline: { label: "דדליין", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: MdWarning },
  reminder: { label: "תזכורת", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: MdNotifications },
  task: { label: "משימה", color: "text-dotan-green", bg: "bg-dotan-mint-light", border: "border-dotan-green", icon: MdAssignment },
  weekly: { label: "שבועי", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: MdCalendarToday },
  daily: { label: "יומי", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", icon: MdAccessTime },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "דחוף", color: "text-red-600", dot: "bg-red-500" },
  high: { label: "חשוב", color: "text-orange-500", dot: "bg-orange-400" },
  normal: { label: "רגיל", color: "text-dotan-green", dot: "bg-dotan-green" },
  low: { label: "נמוך", color: "text-gray-400", dot: "bg-gray-400" },
};

export const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
export const DAYS_HE = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
