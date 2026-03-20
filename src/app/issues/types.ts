import {
  MdFiberNew, MdBuild, MdWarning, MdCheckCircle,
} from "react-icons/md";
import type { Dictionary } from "@/i18n";

export interface User {
  id: string;
  name: string;
  image: string | null;
  roomNumber?: string | null;
  phone?: string | null;
}

export interface IssueComment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface IssueAssignee {
  id: string;
  user: User;
}

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  location: string | null;
  imageUrl: string | null;
  companion: string | null;
  companionPhone: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  assignees: IssueAssignee[];
  comments: IssueComment[];
}

export interface Summary {
  total: number;
  new: number;
  open: number;
  urgent: number;
  closed: number;
}

export const STATUS_CONFIG: Record<string, { label: string; icon: typeof MdFiberNew; color: string; bg: string; border: string }> = {
  new: { label: "חדשה", icon: MdFiberNew, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  open: { label: "פתוחה", icon: MdBuild, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  urgent: { label: "דחופה", icon: MdWarning, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  closed: { label: "סגורה", icon: MdCheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
};

export function getStatusConfig(t: Dictionary) {
  return {
    new: { ...STATUS_CONFIG.new, label: t.issues.statusNew },
    open: { ...STATUS_CONFIG.open, label: t.issues.statusOpen },
    urgent: { ...STATUS_CONFIG.urgent, label: t.issues.statusUrgent },
    closed: { ...STATUS_CONFIG.closed, label: t.issues.statusClosed },
  } as typeof STATUS_CONFIG;
}

export const formatDate = (d: string, dateLocale = "he-IL") =>
  new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
