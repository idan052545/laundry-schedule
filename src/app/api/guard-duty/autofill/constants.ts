// ─── CONSTRAINTS ───

// Per-slot person count for each role (based on 18.3 actual XLSX data)
// Key = "role", Value = per-slot count map. Default = 1 for all slots.
// 0 means role doesn't exist in that slot.
export const SLOT_ROLE_COUNTS: Record<string, Record<string, number>> = {
  "שג רכוב קדמי": {
    "09:00-12:00": 2, "12:00-16:00": 2, "16:00-20:00": 2,
    "20:00-00:00": 2, "00:00-04:00": 2, "04:00-08:00": 2,
  },
  "שג רכוב אחורי": {
    "09:00-12:00": 1, "12:00-16:00": 1, "16:00-20:00": 2,
    "20:00-00:00": 2, "00:00-04:00": 2, "04:00-08:00": 2,
  },
  "שג רגלי": {
    "09:00-12:00": 1, "12:00-16:00": 1, "16:00-20:00": 1,
    "20:00-00:00": 0, "00:00-04:00": 0, "04:00-08:00": 1,
  },
  "עתודה": {
    "09:00-12:00": 2, "12:00-16:00": 1, "16:00-20:00": 1,
    "20:00-00:00": 1, "00:00-04:00": 1, "04:00-08:00": 1,
  },
};

// Partial-time notes: when a person only covers part of a slot
// Key = "role|slot|position", position 0 = first person, 1 = second person
// Based on 18.3 XLSX actual data
export const SLOT_ROLE_NOTES: Record<string, Record<string, string[]>> = {
  "שג רכוב אחורי": {
    "16:00-20:00": ["16:00-20:00", "17:00-20:00"], // person 1 full, person 2 partial
    "04:00-08:00": ["04:00-08:00", "04:00-05:00"], // person 1 full, person 2 short
  },
  "שג רגלי": {
    "16:00-20:00": ["16:00-19:00"], // partial coverage
    "04:00-08:00": ["07:00-08:00"], // partial coverage
  },
};

// עתודה doesn't count toward hours (reserve only)
export const RESERVE_ROLES = ["עתודה"];

// Day roles — assigned once per day, not per shift
export const DAY_ROLES = ['כ"כא', 'כ"כב'];

// ─── PERSONAL EXEMPTIONS ───
// All exemptions apply to GUARD (שמירות) table only — everyone can do עב"ס
export interface PersonalRule {
  type: "no-guard" | "roles-only" | "no-night" | "no-kk" | "no-night-must-pair";
  allowedRoles?: string[];  // for "roles-only"
}

export const PERSONAL_RULES: Record<string, PersonalRule> = {
  "טל הנגבי": { type: "no-guard" },
  "יובל ישר": { type: "no-guard" },
  // צוות כמ (except נעם שילה and יהונתן אבוקרט who can do everything)
  // Can do: שג רגלי, נשקייה, כ"כא, כ"כב
  "אוהד אבדי": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "דור מנשה קיפגן": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "עמנואל נמרודי": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "הגרה שווגר": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "רננה ישראלוב": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "ליאורה אייזק": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "עידן טורקיה": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "רועי דדון": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "אלון זלנפרוינד": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  "נגה ברק": { type: "roles-only", allowedRoles: ["שג רגלי", "נשקייה"] },
  // תמר — no night at all
  "תמר נגר": { type: "no-night" },
  // אופק — no night + must guard in pair
  "אופק מזור": { type: "no-night-must-pair" },
  "הודיה יעקבי": { type: "no-kk" },
};

// ─── SQUADS (חוליות) ───
// Each squad should ideally guard at the same time (soft constraint)
export const SQUADS: string[][] = [
  ["כפיר ברמן", "ורוורה טופן", "מעיין מרדכי"],
  ["רעות ניר", "אופק מזור", "עידן סימנטוב"],
  ["יהלי כוכבא", "עילי בן אברהם", "יזן כנעאן"],
  ["שילת נוימן", "אלה בן גיא", "יהלי לוי"],
  ["נועה גלמן", "רותם כוכבי", "שני זידמן"],
  ["עדן בחרוף", "הללי בר יוסף", "פיונה פנג"],
  ["יעל שושן", "שיר סויסה", "לייה אלון"],
  ["אורי חדד", "איתן אונגר", "אייל מוזר"],
  ["מאי אילארי", "דנה פרידמן", "מאי צימרמן"],
  ["הודיה יעקבי", "כרמל מורן", "נועה בלפור"],
  ["הילה פינצי", "רוני קרפט", "מיקה חיים"],
  ["רוני מאירסון", "עמית שושנה", "נעמה לביא"],
  ["ענבר שלח", "עילי גולדשטיין", "יניב גופמן", "נטע וילונסקי"],
  ["עידן טורקיה", "דור מנשה קיפגן", "רננה ישראלוב"],
  ["אלון זלנפרוינד", "ליאורה אייזק", "נעם שילה", "יערה רחוביצקי"],
  ["דולב כהן"],
  ["עמנואל נמרודי", "נגה ברק", "הגרה שווגר"],
  ["רועי דדון", "יהונתן אבוקרט", "אוהד אבדי"],
];

// ─── KITCHEN ───
export const KITCHEN_SHIFTS = ["06:00-10:30", "10:30-16:00", "16:00-22:00"];
export const KITCHEN_SHIFT_HOURS: Record<string, number> = {
  "06:00-10:30": 4.5,
  "10:30-16:00": 5.5,
  "16:00-22:00": 6,
};
