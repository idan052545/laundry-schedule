import { MdPoll, MdThumbUp, MdRadioButtonChecked, MdCheckBox } from "react-icons/md";

export interface User {
  id: string;
  name: string;
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

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
