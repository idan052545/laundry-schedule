import {
  MdMessage,
  MdAssignment,
  MdNotifications,
  MdImage,
  MdThumbUp,
  MdRadioButtonChecked,
  MdCheckBox,
} from "react-icons/md";
import type { Dictionary } from "@/i18n";

export interface Commander {
  id: string;
  name: string;
  image: string | null;
  roleTitle: string | null;
  role: string;
  _count: { commanderPosts: number };
}

export interface CommanderPost {
  id: string;
  type: string;
  title: string;
  content: string;
  imageUrl: string | null;
  pinned: boolean;
  dueDate: string | null;
  createdAt: string;
  author: { id: string; name: string; image: string | null; roleTitle: string | null };
}

export interface SurveyUser {
  id: string;
  name: string;
  image: string | null;
  team?: number | null;
}

export interface SurveyResponse {
  id: string;
  answer: string;
  user: SurveyUser;
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
  createdBy: SurveyUser;
  responses: SurveyResponse[];
}

export const POST_TYPE_CONFIG: Record<string, { label: string; icon: typeof MdMessage; color: string; bg: string }> = {
  message: { label: "הודעה", icon: MdMessage, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  task: { label: "משימה", icon: MdAssignment, color: "text-dotan-green", bg: "bg-dotan-mint-light border-dotan-green" },
  reminder: { label: "תזכורת", icon: MdNotifications, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  image: { label: "תמונה", icon: MdImage, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
};

export function getPostTypeConfig(t: Dictionary) {
  return {
    message: { ...POST_TYPE_CONFIG.message, label: t.commander.postTypeMessage },
    task: { ...POST_TYPE_CONFIG.task, label: t.commander.postTypeTask },
    reminder: { ...POST_TYPE_CONFIG.reminder, label: t.commander.postTypeReminder },
    image: { ...POST_TYPE_CONFIG.image, label: t.commander.postTypeImage },
  } as typeof POST_TYPE_CONFIG;
}

export const SURVEY_TYPE_CONFIG: Record<string, { label: string; icon: typeof MdThumbUp }> = {
  yes_no: { label: "כן / לא", icon: MdThumbUp },
  single: { label: "בחירה יחידה", icon: MdRadioButtonChecked },
  multi: { label: "בחירה מרובה", icon: MdCheckBox },
};

export function getSurveyTypeConfig(t: Dictionary) {
  return {
    yes_no: { ...SURVEY_TYPE_CONFIG.yes_no, label: t.commander.surveyYesNo },
    single: { ...SURVEY_TYPE_CONFIG.single, label: t.commander.surveySingle },
    multi: { ...SURVEY_TYPE_CONFIG.multi, label: t.commander.surveyMulti },
  } as typeof SURVEY_TYPE_CONFIG;
}
