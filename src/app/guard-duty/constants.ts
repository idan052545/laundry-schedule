export interface UserMin { id: string; name: string; nameEn?: string | null; team: number | null; image: string | null; roomNumber?: string | null; }

export interface Assignment {
  id: string;
  userId: string;
  timeSlot: string;
  role: string;
  note: string | null;
  user: UserMin;
}

export interface DutyTable {
  id: string;
  title: string;
  date: string;
  type: string;
  roles: string;
  timeSlots: string;
  metadata: string | null;
  assignments: Assignment[];
}

export interface Appeal {
  id: string;
  assignmentId: string;
  userId: string;
  user: UserMin;
  reason: string;
  suggestedUserId: string | null;
  suggestedUser: UserMin | null;
  status: string;
  createdAt: string;
}

export const ROLE_COLORS: Record<string, string> = {
  "שג רכוב קדמי": "bg-purple-800 text-white",
  "שג רכוב אחורי": "bg-purple-600 text-white",
  "שג רגלי": "bg-gray-800 text-white",
  "פטל": "bg-red-600 text-white",
  "ימ\"ח": "bg-blue-700 text-white",
  "בונקר": "bg-red-700 text-white",
  "נשקייה": "bg-green-700 text-white",
  "תצפיתן": "bg-yellow-600 text-white",
  "עתודה": "bg-gray-600 text-white",
  "כ\"כא": "bg-teal-700 text-white",
  "כ\"כב": "bg-teal-500 text-white",
};

export const ROLE_NOTES: Record<string, string> = {
  "שג רכוב קדמי": "תמיד 2",
  "שג רכוב אחורי": "1 רק 5-17",
  "שג רגלי": "7:00-19:00",
};

export const DEFAULT_GUARD_ROLES = [
  "שג רכוב קדמי", "שג רכוב אחורי", "שג רגלי", "פטל",
  "ימ\"ח", "בונקר", "נשקייה", "תצפיתן", "עתודה", "כ\"כא", "כ\"כב",
];

export const DEFAULT_GUARD_SLOTS = [
  "09:00-12:00", "12:00-16:00", "16:00-20:00", "20:00-00:00", "00:00-04:00", "04:00-08:00",
];

export const DEFAULT_OBS_ROLES = ["08:30-11:30", "13:30-17:30", "18:30-20:00"];
export const DEFAULT_OBS_SLOTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];

export const DAY_ROLES = ['כ"כא', 'כ"כב'];
export const RESERVE_ROLES = ["עתודה"];

export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
}

export function parseTimeRange(range: string) {
  const parts = range.split("-");
  if (parts.length !== 2) return 0;
  const [s, e] = parts;
  const sp = s.split(":").map(Number);
  const ep = e.split(":").map(Number);
  if (sp.length < 2 || ep.length < 2 || sp.some(isNaN) || ep.some(isNaN)) return 0;
  let h = (ep[0] * 60 + ep[1] - sp[0] * 60 - sp[1]) / 60;
  if (h < 0) h += 24;
  return h;
}

export type Overlap = { type: "same-slot" | "cross-table"; userId: string; userName: string; details: string };

// ─── פטורים (exemptions) display data ───
export interface ExemptionInfo {
  name: string;
  type: string;  // short label
  detail: string; // what they can/can't do
  color: string;  // badge color
}

export const EXEMPTIONS: ExemptionInfo[] = [
  { name: "טל הנגבי", type: "פטור שמירה", detail: "לא שומר כלל", color: "bg-red-100 text-red-700 border-red-200" },
  { name: "יובל ישר", type: "פטור שמירה", detail: "לא שומר כלל", color: "bg-red-100 text-red-700 border-red-200" },
  { name: "תמר נגר", type: "ללא לילה", detail: "לא משובצת בלילה", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { name: "אופק מזור", type: "ללא לילה + זוג", detail: "לא בלילה, רק תפקידים עם זוג", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { name: "הודיה יעקבי", type: 'ללא כ"כ', detail: 'לא משובצת לכ"כא/כ"כב', color: "bg-blue-100 text-blue-700 border-blue-200" },
  // צוות כמ — roles-only
  { name: "אוהד אבדי", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "דור מנשה קיפגן", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "עמנואל נמרודי", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "הגרה שווגר", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "רננה ישראלוב", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "ליאורה אייזק", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "עידן טורקיה", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "רועי דדון", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "אלון זלנפרוינד", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "נגה ברק", type: "צוות כמ", detail: "רק שג רגלי / נשקייה / כ\"כ", color: "bg-purple-100 text-purple-700 border-purple-200" },
];

// ─── Kitchen duty ───

export const KITCHEN_SHIFTS = ["06:00-10:30", "10:30-16:00", "16:00-22:00"];

export const KITCHEN_SHIFT_LABELS: Record<string, string> = {
  "06:00-10:30": "בוקר",
  "10:30-16:00": "צהריים",
  "16:00-22:00": "ערב",
};

export const KITCHEN_SHIFT_COLORS: Record<string, string> = {
  "06:00-10:30": "bg-orange-600 text-white",
  "10:30-16:00": "bg-orange-500 text-white",
  "16:00-22:00": "bg-amber-600 text-white",
};
