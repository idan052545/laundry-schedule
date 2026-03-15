import {
  MdEvent, MdRestaurant, MdFitnessCenter, MdFlag, MdFreeBreakfast,
} from "react-icons/md";

export const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string; dot: string }> = {
  general: { label: "כללי", icon: MdEvent, color: "text-gray-600", bg: "bg-white", border: "border-gray-200", dot: "bg-gray-400" },
  meal: { label: "ארוחה", icon: MdRestaurant, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-400" },
  training: { label: "אימון", icon: MdFitnessCenter, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-400" },
  ceremony: { label: "טקס/מסדר", icon: MdFlag, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-400" },
  free: { label: "זמן חופשי", icon: MdFreeBreakfast, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-400" },
};

export const TARGET_LABELS: Record<string, string> = {
  all: "כל הפלוגה",
  "team-14": "צוות 14",
  "team-15": "צוות 15",
  "team-16": "צוות 16",
  "team-17": "צוות 17",
};
