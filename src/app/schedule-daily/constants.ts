import {
  MdEvent, MdRestaurant, MdFitnessCenter, MdFlag, MdFreeBreakfast,
} from "react-icons/md";
import { Dictionary } from "@/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; dot: string }> = {
  general: { icon: MdEvent, color: "text-gray-600", bg: "bg-white", border: "border-gray-200", dot: "bg-gray-400" },
  meal: { icon: MdRestaurant, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-400" },
  training: { icon: MdFitnessCenter, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-400" },
  ceremony: { icon: MdFlag, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-400" },
  free: { icon: MdFreeBreakfast, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-400" },
};

export function getTypeLabels(t: Dictionary): Record<string, string> {
  return {
    general: t.schedule.typeGeneral,
    meal: t.schedule.typeMeal,
    training: t.schedule.typeTraining,
    ceremony: t.schedule.typeCeremony,
    free: t.schedule.typeFreeTime,
  };
}

export function getTargetLabels(t: Dictionary): Record<string, string> {
  return {
    all: t.teams.allPlatoon,
    "team-14": t.teams.team14,
    "team-15": t.teams.team15,
    "team-16": t.teams.team16,
    "team-17": t.teams.team17,
  };
}
