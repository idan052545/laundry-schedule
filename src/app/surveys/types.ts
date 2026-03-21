import { MdPoll, MdThumbUp, MdRadioButtonChecked, MdCheckBox } from "react-icons/md";
import type { Dictionary } from "@/i18n";

export interface User {
  id: string;
  name: string;
  nameEn?: string | null;
  image: string | null;
  team?: number | null;
}

export interface SurveyResponse {
  id: string;
  answer: string;
  user: User;
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  team: number;
  type: string;
  options: string | null;
  status: string;
  createdById: string;
  createdAt: string;
  createdBy: User;
  responses: SurveyResponse[];
}

export const TYPE_CONFIG: Record<string, { label: string; icon: typeof MdPoll }> = {
  yes_no: { label: "כן / לא", icon: MdThumbUp },
  single: { label: "בחירה יחידה", icon: MdRadioButtonChecked },
  multi: { label: "בחירה מרובה", icon: MdCheckBox },
};

export function getTypeConfig(t: Dictionary): Record<string, { label: string; icon: typeof MdPoll }> {
  return {
    yes_no: { label: t.surveys.typeYesNo, icon: MdThumbUp },
    single: { label: t.surveys.typeSingle, icon: MdRadioButtonChecked },
    multi: { label: t.surveys.typeMulti, icon: MdCheckBox },
  };
}

export const formatDate = (d: string, dateLocale = "he-IL") =>
  new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
