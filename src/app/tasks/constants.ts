import {
  MdAssignment, MdWarning, MdNotifications, MdCalendarToday, MdAccessTime,
} from "react-icons/md";
import { Dictionary } from "@/i18n";

export const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof MdAssignment }> = {
  deadline: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: MdWarning },
  reminder: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: MdNotifications },
  task: { color: "text-dotan-green", bg: "bg-dotan-mint-light", border: "border-dotan-green", icon: MdAssignment },
  weekly: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: MdCalendarToday },
  daily: { color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", icon: MdAccessTime },
};

export function getCategoryLabels(t: Dictionary): Record<string, string> {
  return {
    deadline: t.tasks.typeDeadline,
    reminder: t.tasks.typeReminder,
    task: t.tasks.typeTask,
    weekly: t.tasks.typeWeekly,
    daily: t.tasks.typeDaily,
  };
}

export const PRIORITY_CONFIG: Record<string, { color: string; dot: string }> = {
  urgent: { color: "text-red-600", dot: "bg-red-500" },
  high: { color: "text-orange-500", dot: "bg-orange-400" },
  normal: { color: "text-dotan-green", dot: "bg-dotan-green" },
  low: { color: "text-gray-400", dot: "bg-gray-400" },
};

export function getPriorityLabels(t: Dictionary): Record<string, string> {
  return {
    urgent: t.priorities.urgent,
    high: t.priorities.important,
    normal: t.priorities.normal,
    low: t.priorities.low,
  };
}

export function getMonthsArray(t: Dictionary): string[] {
  return [
    t.months.jan, t.months.feb, t.months.mar, t.months.apr,
    t.months.may, t.months.jun, t.months.jul, t.months.aug,
    t.months.sep, t.months.oct, t.months.nov, t.months.dec,
  ];
}

export function getDaysArray(t: Dictionary): string[] {
  return [t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat];
}

export const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
export const DAYS_HE = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
