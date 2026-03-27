import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const RONI_NAME = "רוני קרפט";

async function isRoni(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.name === RONI_NAME || user?.email === "ohad@dotan.com" || user?.role === "admin";
}

// ─── CONSTRAINTS ───

// Guard roles: multi-person roles need 2, rest need 1
const MULTI_PERSON_ROLES: Record<string, number> = {
  "שג רכוב קדמי": 2,
};

// עתודה doesn't count toward hours (reserve only)
const RESERVE_ROLES = ["עתודה"];

// Day roles — assigned once per day, not per shift
const DAY_ROLES = ['כ"כא', 'כ"כב'];

// Roles that only exist in certain time ranges
const ROLE_TIME_RESTRICTIONS: Record<string, { startHour: number; endHour: number }> = {
  "שג רכוב אחורי": { startHour: 5, endHour: 17 },
  "שג רגלי": { startHour: 7, endHour: 19 },
};

// Night slots (for exemptions that forbid night)
function isNightSlot(slot: string): boolean {
  const h = parseInt(slot.split(":")[0]);
  return h >= 20 || h < 8;
}

// ─── PERSONAL EXEMPTIONS ───
// Key = user name, Value = constraint
// All exemptions apply to GUARD (שמירות) table only — everyone can do עב"ס
interface PersonalRule {
  type: "no-guard" | "roles-only" | "no-night" | "no-kk" | "no-night-must-pair";
  allowedRoles?: string[];  // for "roles-only"
}

const PERSONAL_RULES: Record<string, PersonalRule> = {
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

// ─── GENDER ───
// Night pairs must be same gender (בת עם בת, בן עם בן)
// Room 400+ = female, below 400 = male
function isFemaleByRoom(roomNumber: string | null | undefined): boolean {
  if (!roomNumber) return false;
  const num = parseInt(roomNumber);
  return !isNaN(num) && num >= 400;
}

// ─── כ"כ ROOM RULES ───
// כ"כא and כ"כב must each be 5 people all from the same room
// Rooms are detected dynamically — find rooms with 5+ eligible people

// ─── SQUADS (חוליות) ───
// Each squad should ideally guard at the same time (soft constraint)
const SQUADS: string[][] = [
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

// ─── HELPERS ───

function parseTimeSlot(slot: string): { startMin: number; endMin: number; hours: number } {
  const parts = slot.split("-");
  if (parts.length !== 2) return { startMin: 0, endMin: 0, hours: 0 };
  const [sh, sm] = parts[0].split(":").map(Number);
  const [eh, em] = parts[1].split(":").map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return { startMin: 0, endMin: 0, hours: 0 };
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 1440;
  return { startMin, endMin, hours: (endMin - startMin) / 60 };
}

function slotsOverlap(a: string, b: string): boolean {
  const pa = parseTimeSlot(a);
  const pb = parseTimeSlot(b);
  return pa.startMin < pb.endMin && pb.startMin < pa.endMin;
}

function nameMatch(dbName: string, ruleName: string): boolean {
  return dbName === ruleName || dbName.includes(ruleName) || ruleName.includes(dbName);
}

function getPersonalRule(userName: string): PersonalRule | null {
  for (const [name, rule] of Object.entries(PERSONAL_RULES)) {
    if (nameMatch(userName, name)) return rule;
  }
  return null;
}

function getSquadIndex(userName: string): number {
  for (let i = 0; i < SQUADS.length; i++) {
    if (SQUADS[i].some(m => nameMatch(userName, m))) return i;
  }
  return -1;
}

/** Check if a user can take a specific role in a specific time slot.
 *  tableType: "guard" or "obs" — exemptions only apply to guard table */
function canUserTakeRole(userName: string, role: string, slot: string, tableType: "guard" | "obs" = "guard"): boolean {
  if (tableType === "obs") return true; // all exemptions are guard-only, everyone can do עב"ס
  const rule = getPersonalRule(userName);
  if (!rule) return true;

  switch (rule.type) {
    case "no-guard":
      return false;

    case "roles-only":
      // Can do their allowed roles + כ"כא/כ"כב
      if (DAY_ROLES.includes(role)) return true;
      return rule.allowedRoles!.includes(role);

    case "no-kk":
      return !DAY_ROLES.includes(role);

    case "no-night":
      // No night shifts at all, any day role is fine
      return !isNightSlot(slot);

    case "no-night-must-pair":
      // No night shifts. During day: any role (pair enforced in findBestCandidate)
      return !isNightSlot(slot);

    default:
      return true;
  }
}

// ─── POST — auto-fill guard + obs tables for a date ───

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { date, types } = await req.json();
  if (!date || !types || !Array.isArray(types)) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  // Get all eligible users (exclude sagal, admin, simulator)
  const allUsers = await prisma.user.findMany({
    where: { role: { notIn: ["admin", "sagal"] } },
    select: { id: true, name: true, nameEn: true, team: true, image: true, role: true, roleTitle: true, roomNumber: true },
    orderBy: { name: "asc" },
  });

  // Filter out simulator users
  const allEligible = allUsers.filter(u =>
    !u.roleTitle?.includes("סימולטור") && !u.roleTitle?.includes("simulator")
  );

  // For guard: also exclude no-guard exemptions. For obs: everyone is eligible.
  const guardEligible = allEligible.filter(u => {
    const rule = getPersonalRule(u.name);
    return rule?.type !== "no-guard";
  });
  const obsEligible = allEligible; // everyone can do עב"ס

  // Get historical hours for fairness
  const allAssignments = await prisma.dutyAssignment.findMany({
    select: { userId: true, timeSlot: true, role: true },
  });

  const hoursMap: Record<string, number> = {};
  for (const a of allAssignments) {
    if (DAY_ROLES.includes(a.role)) continue;
    if (RESERVE_ROLES.includes(a.role)) continue;
    const h = parseTimeSlot(a.timeSlot).hours || parseTimeSlot(a.role).hours;
    if (h > 0) hoursMap[a.userId] = (hoursMap[a.userId] || 0) + h;
  }

  // ─── טבלת צדק: accumulated fairness debt ───
  // Positive debt = user was over-assigned historically → deprioritize
  // Negative debt = user was under-assigned → prioritize
  const fairnessRecords = await prisma.dutyFairness.findMany({
    select: { userId: true, debt: true },
  });
  const debtMap: Record<string, number> = {};
  for (const f of fairnessRecords) {
    debtMap[f.userId] = (debtMap[f.userId] || 0) + f.debt;
  }

  // Check existing tables for cross-table overlaps
  const existingTables = await prisma.dutyTable.findMany({
    where: { date },
    include: { assignments: true },
  });

  const userBusy: Record<string, string[]> = {};
  for (const t of existingTables) {
    for (const a of t.assignments) {
      if (DAY_ROLES.includes(a.role)) continue;
      if (!userBusy[a.userId]) userBusy[a.userId] = [];
      const timeRange = a.note || a.timeSlot;
      if (timeRange.includes("-")) userBusy[a.userId].push(timeRange);
    }
  }

  const result: Record<string, {
    title: string;
    roles: string[];
    timeSlots: string[];
    assignments: { userId: string; timeSlot: string; role: string }[];
    stats: { totalHours: number; usersUsed: number; fairnessScore: number };
  }> = {};

  if (types.includes("kitchen")) {
    result.kitchen = buildKitchenTable(allEligible, hoursMap, debtMap);
  }

  if (types.includes("guard")) {
    result.guard = buildGuardTable(guardEligible, hoursMap, debtMap, userBusy);
  }

  if (types.includes("obs")) {
    if (result.guard) {
      for (const a of result.guard.assignments) {
        if (DAY_ROLES.includes(a.role)) continue;
        if (!userBusy[a.userId]) userBusy[a.userId] = [];
        userBusy[a.userId].push(a.timeSlot);
      }
    }
    result.obs = buildObsTable(obsEligible, hoursMap, debtMap, userBusy);
  }

  // ─── עב"ס גדודי: 1 person per team (14-17), weekly rotation ───
  let obsGdudi: { userId: string; name: string; team: number }[] = [];
  if (types.includes("guard") || types.includes("obs")) {
    const TEAMS = [14, 15, 16, 17];
    // Collect all users already assigned in guard + obs for this day
    const allAssigned = new Set<string>();
    if (result.guard) result.guard.assignments.forEach(a => allAssigned.add(a.userId));
    if (result.obs) result.obs.assignments.forEach(a => allAssigned.add(a.userId));

    for (const team of TEAMS) {
      const teamMembers = allEligible.filter(u => u.team === team);
      if (teamMembers.length === 0) continue;

      // Sort by debt ascending (least debt = most priority), prefer non-busy users
      const sorted = [...teamMembers].sort((a, b) => {
        const aDebt = debtMap[a.id] || 0;
        const bDebt = debtMap[b.id] || 0;
        const aBusy = allAssigned.has(a.id) ? 1 : 0;
        const bBusy = allAssigned.has(b.id) ? 1 : 0;
        if (aBusy !== bBusy) return aBusy - bBusy;
        return aDebt - bDebt;
      });

      obsGdudi.push({ userId: sorted[0].id, name: sorted[0].name, team });
    }
  }

  return NextResponse.json({ success: true, tables: result, obsGdudi });
}

// ─── Types ───

interface EligibleUser {
  id: string;
  name: string;
  nameEn?: string | null;
  team: number | null;
  image: string | null;
  roomNumber?: string | null;
}

// ─── BUILD GUARD TABLE ───

function buildGuardTable(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
  userBusy: Record<string, string[]>,
) {
  const roles = [
    "שג רכוב קדמי", "שג רכוב אחורי", "שג רגלי", "פטל",
    'ימ"ח', "בונקר", "נשקייה", "תצפיתן", "עתודה", 'כ"כא', 'כ"כב',
  ];
  const slots = ["08:00-12:00", "12:00-16:00", "16:00-20:00", "20:00-00:00", "00:00-04:00", "04:00-08:00"];

  const assignments: { userId: string; timeSlot: string; role: string }[] = [];
  const localAssignments: Record<string, { role: string; timeSlot: string }[]> = {};

  // Build name→user map for squad lookups
  const nameToUser: Record<string, EligibleUser> = {};
  for (const u of users) nameToUser[u.name] = u;

  // Build squad member id sets
  const squadMembers: { squadIdx: number; userIds: string[] }[] = SQUADS.map((squad, idx) => ({
    squadIdx: idx,
    userIds: squad.map(name => {
      const u = users.find(u => nameMatch(u.name, name));
      return u?.id;
    }).filter(Boolean) as string[],
  }));

  // Build room→users map for כ"כ assignment
  const roomUsers: Record<string, EligibleUser[]> = {};
  for (const u of users) {
    if (!u.roomNumber) continue;
    if (!roomUsers[u.roomNumber]) roomUsers[u.roomNumber] = [];
    roomUsers[u.roomNumber].push(u);
  }

  // ─── 1. Assign כ"כא and כ"כב (5 people each, all from same room) ───
  // Find all rooms with 5+ eligible people for כ"כ, pick the two best
  const kkCandidateRooms: { room: string; eligible: EligibleUser[] }[] = [];
  for (const [room, roomMembers] of Object.entries(roomUsers)) {
    const eligible = roomMembers.filter(u => canUserTakeRole(u.name, 'כ"כא', "08:00-12:00"));
    if (eligible.length >= 5) {
      kkCandidateRooms.push({ room, eligible });
    }
  }
  // Sort by room size descending so we pick rooms with most options first
  kkCandidateRooms.sort((a, b) => b.eligible.length - a.eligible.length);

  const usedKkRooms = new Set<string>();
  for (const dayRole of DAY_ROLES) {
    // Pick first available room not already used
    const roomEntry = kkCandidateRooms.find(r => !usedKkRooms.has(r.room));
    if (!roomEntry) continue;

    usedKkRooms.add(roomEntry.room);
    const candidates = [...roomEntry.eligible];
    candidates.sort((a, b) => (hoursMap[a.id] || 0) - (hoursMap[b.id] || 0));
    const picked = candidates.slice(0, 5);

    for (const u of picked) {
      assignments.push({ userId: u.id, timeSlot: slots[0], role: dayRole });
      if (!localAssignments[u.id]) localAssignments[u.id] = [];
      localAssignments[u.id].push({ role: dayRole, timeSlot: "day" });
    }
  }

  // ─── 2. Build slot×role work items ───
  const slotRolePairs: { slot: string; role: string; count: number; hardness: number }[] = [];

  for (const slot of slots) {
    const { startMin } = parseTimeSlot(slot);
    const startHour = startMin / 60;

    for (const role of roles) {
      if (DAY_ROLES.includes(role)) continue;

      const restriction = ROLE_TIME_RESTRICTIONS[role];
      if (restriction) {
        if (startHour < restriction.startHour || startHour >= restriction.endHour) continue;
      }

      const count = MULTI_PERSON_ROLES[role] || 1;

      let hardness = 0;
      if (startHour >= 20 || startHour < 8) hardness += 10;
      if (startHour >= 0 && startHour < 8) hardness += 5;
      if (RESERVE_ROLES.includes(role)) hardness -= 20;
      if (count > 1) hardness += 3;

      slotRolePairs.push({ slot, role, count, hardness });
    }
  }

  // Total needed = sum of all counts
  const totalNeeded = slotRolePairs.reduce((s, p) => s + p.count, 0);

  // ─── 3. Try multiple orderings to find best complete assignment ───
  // Run up to 5 attempts with different sort strategies. Pick the one that
  // fills the most slots (ideally all) with best fairness.
  const MAX_ATTEMPTS = 5;
  let bestResult = { assignments: [...assignments], localAssignments: { ...localAssignments }, filled: 0, fairness: 0 };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Clone state from after כ"כ assignment
    const tryAssignments = [...assignments];
    const tryLocal: Record<string, { role: string; timeSlot: string }[]> = {};
    for (const [k, v] of Object.entries(localAssignments)) tryLocal[k] = [...v];
    const tryBusy: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(userBusy)) tryBusy[k] = [...v];

    // Sort pairs differently each attempt
    const sorted = [...slotRolePairs];
    if (attempt === 0) {
      // Default: hardness descending (hardest first)
      sorted.sort((a, b) => b.hardness - a.hardness);
    } else if (attempt === 1) {
      // Restricted roles first (roles with time restrictions or exemptions)
      sorted.sort((a, b) => {
        const aRestricted = ROLE_TIME_RESTRICTIONS[a.role] ? 1 : 0;
        const bRestricted = ROLE_TIME_RESTRICTIONS[b.role] ? 1 : 0;
        return bRestricted - aRestricted || b.hardness - a.hardness;
      });
    } else {
      // Add random jitter to hardness for diversity
      sorted.sort((a, b) => (b.hardness + Math.random() * 6 - 3) - (a.hardness + Math.random() * 6 - 3));
    }

    let filled = 0;
    for (const { slot, role, count } of sorted) {
      const isReserve = RESERVE_ROLES.includes(role);
      for (let i = 0; i < count; i++) {
        const candidate = findBestCandidate(
          users, hoursMap, debtMap, tryLocal, tryBusy, slot, role, false, isReserve, squadMembers, "guard"
        );
        if (candidate) {
          tryAssignments.push({ userId: candidate.id, timeSlot: slot, role });
          if (!tryLocal[candidate.id]) tryLocal[candidate.id] = [];
          tryLocal[candidate.id].push({ role, timeSlot: slot });
          if (!tryBusy[candidate.id]) tryBusy[candidate.id] = [];
          if (!isReserve) tryBusy[candidate.id].push(slot);
          filled++;
        }
      }
    }

    // Compute fairness for this attempt
    const tryUserHours: Record<string, number> = {};
    for (const a of tryAssignments) {
      if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
      const h = parseTimeSlot(a.timeSlot).hours;
      tryUserHours[a.userId] = (tryUserHours[a.userId] || 0) + h;
    }
    const hv = Object.values(tryUserHours);
    const tryAvg = hv.length > 0 ? hv.reduce((s, v) => s + v, 0) / hv.length : 0;
    const tryVar = hv.length > 0 ? hv.reduce((s, v) => s + (v - tryAvg) ** 2, 0) / hv.length : 0;
    const tryFairness = tryAvg > 0 ? Math.max(0, 100 - (Math.sqrt(tryVar) / tryAvg) * 100) : 100;

    // Pick best: most filled first, then best fairness
    if (filled > bestResult.filled || (filled === bestResult.filled && tryFairness > bestResult.fairness)) {
      bestResult = { assignments: tryAssignments, localAssignments: tryLocal, filled, fairness: tryFairness };
    }

    // Perfect: all filled — stop early
    if (filled >= totalNeeded) break;
  }

  // Use best result
  const finalAssignments = bestResult.assignments;

  // Compute stats
  const usedUsers = new Set(finalAssignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of finalAssignments) {
    if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
    const h = parseTimeSlot(a.timeSlot).hours;
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return {
    title: "שיבוץ לשמירות",
    roles,
    timeSlots: slots,
    assignments: finalAssignments,
    stats: { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) },
  };
}

// ─── BUILD OBS TABLE ───

function buildObsTable(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
  userBusy: Record<string, string[]>,
) {
  const obsTimeRanges = ["08:30-11:30", "13:30-17:30", "18:30-20:00"];
  const obsPositions = Array.from({ length: 20 }, (_, i) => String(i + 1));

  const assignments: { userId: string; timeSlot: string; role: string }[] = [];
  const localAssignments: Record<string, { role: string; timeSlot: string }[]> = {};

  for (const timeRange of obsTimeRanges) {
    for (const pos of obsPositions) {
      const candidate = findBestCandidate(
        users, hoursMap, debtMap, localAssignments, userBusy, timeRange, timeRange, false, false, [], "obs"
      );
      if (candidate) {
        assignments.push({ userId: candidate.id, timeSlot: pos, role: timeRange });
        if (!localAssignments[candidate.id]) localAssignments[candidate.id] = [];
        localAssignments[candidate.id].push({ role: timeRange, timeSlot: pos });

        if (!userBusy[candidate.id]) userBusy[candidate.id] = [];
        userBusy[candidate.id].push(timeRange);
      }
    }
  }

  const usedUsers = new Set(assignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of assignments) {
    const h = parseTimeSlot(a.role).hours;
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return {
    title: 'עב"ס בהד"י',
    roles: obsTimeRanges,
    timeSlots: obsPositions,
    assignments,
    stats: { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) },
  };
}

// ─── BUILD KITCHEN TABLE ───
// All ~60 users split across 3 shifts. No exemptions. Fairness-based.

const KITCHEN_SHIFTS = ["06:00-10:30", "10:30-16:00", "16:00-22:00"];
const KITCHEN_SHIFT_HOURS: Record<string, number> = {
  "06:00-10:30": 4.5,
  "10:30-16:00": 5.5,
  "16:00-22:00": 6,
};

function buildKitchenTable(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
) {
  const assignments: { userId: string; timeSlot: string; role: string }[] = [];

  // Score users: lower = higher priority (less hours historically + less debt)
  const scored = users.map(u => ({
    user: u,
    score: (hoursMap[u.id] || 0) + (debtMap[u.id] || 0) * 2,
  }));
  scored.sort((a, b) => a.score - b.score);

  // Split evenly across 3 shifts
  const perShift = Math.ceil(scored.length / 3);
  const shifts: { shift: string; users: EligibleUser[] }[] = KITCHEN_SHIFTS.map((shift, i) => ({
    shift,
    users: scored.slice(i * perShift, (i + 1) * perShift).map(s => s.user),
  }));

  // Users with most debt (over-assigned) get the shortest shift (בוקר 4.5h)
  // Users with least debt (under-assigned) get longest shift (ערב 6h) — they were scored lowest, so they appear first
  // Actually: lowest score users are first in the array → first group = ערב (longest, compensates)
  // Let's reverse: assign first group (lowest debt) to ערב, last group (highest debt) to בוקר
  const shiftOrder = ["16:00-22:00", "10:30-16:00", "06:00-10:30"]; // longest → shortest
  const reorderedShifts = shiftOrder.map((shift, i) => ({
    shift,
    users: scored.slice(i * perShift, (i + 1) * perShift).map(s => s.user),
  }));

  // Create positions within each shift
  const maxPerShift = Math.max(...reorderedShifts.map(s => s.users.length));
  const timeSlots = Array.from({ length: maxPerShift }, (_, i) => String(i + 1));

  for (const { shift, users: shiftUsers } of reorderedShifts) {
    for (let i = 0; i < shiftUsers.length; i++) {
      assignments.push({
        userId: shiftUsers[i].id,
        timeSlot: String(i + 1),
        role: shift,
      });
    }
  }

  // Stats
  const usedUsers = new Set(assignments.map(a => a.userId));
  let totalHours = 0;
  const userHoursLocal: Record<string, number> = {};
  for (const a of assignments) {
    const h = KITCHEN_SHIFT_HOURS[a.role] || 0;
    totalHours += h;
    userHoursLocal[a.userId] = (userHoursLocal[a.userId] || 0) + h;
  }
  const hoursValues = Object.values(userHoursLocal);
  const avg = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length : 0;
  const variance = hoursValues.length > 0 ? hoursValues.reduce((s, v) => s + (v - avg) ** 2, 0) / hoursValues.length : 0;
  const fairnessScore = avg > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100) : 100;

  return {
    title: "שיבוץ מטבח",
    roles: KITCHEN_SHIFTS,
    timeSlots,
    assignments,
    stats: { totalHours, usersUsed: usedUsers.size, fairnessScore: Math.round(fairnessScore) },
  };
}

// ─── FIND BEST CANDIDATE ───

function findBestCandidate(
  users: EligibleUser[],
  hoursMap: Record<string, number>,
  debtMap: Record<string, number>,
  localAssignments: Record<string, { role: string; timeSlot: string }[]>,
  userBusy: Record<string, string[]>,
  timeSlot: string,
  role: string,
  isDayRole: boolean,
  isReserve: boolean,
  squadMembers: { squadIdx: number; userIds: string[] }[],
  tableType: "guard" | "obs" = "guard",
): EligibleUser | null {
  // Score each user — lower score = higher priority
  const scored = users.map(u => {
    const hist = hoursMap[u.id] || 0;
    const local = (localAssignments[u.id] || [])
      .filter(a => !DAY_ROLES.includes(a.role) && !RESERVE_ROLES.includes(a.role))
      .reduce((sum, a) => {
        const h = parseTimeSlot(a.timeSlot).hours;
        return sum + (h > 0 ? h : 0);
      }, 0);
    const localCount = (localAssignments[u.id] || []).length;

    // טבלת צדק: accumulated debt from previous dates
    // Positive debt = over-assigned before → higher score → lower priority
    // Negative debt = under-assigned before → lower score → higher priority
    const debt = debtMap[u.id] || 0;

    // Squad bonus: if a squad member is already assigned to this slot, boost priority
    let squadBonus = 0;
    const mySquadIdx = getSquadIndex(u.name);
    if (mySquadIdx >= 0 && squadMembers.length > 0) {
      const squad = squadMembers.find(s => s.squadIdx === mySquadIdx);
      if (squad) {
        const squadMateInSlot = squad.userIds.some(uid =>
          uid !== u.id && (localAssignments[uid] || []).some(a =>
            a.timeSlot === timeSlot && !DAY_ROLES.includes(a.role)
          )
        );
        if (squadMateInSlot) squadBonus = -50; // big boost (lower score = more preferred)
      }
    }

    // debt is weighted x2 to make fairness correction stronger than raw hours
    return { user: u, score: hist + local + (debt * 2) + squadBonus, localCount };
  });

  scored.sort((a, b) => a.score - b.score || a.localCount - b.localCount);

  for (const { user } of scored) {
    // Check personal exemption (guard-only, not obs)
    if (!canUserTakeRole(user.name, role, timeSlot, tableType)) continue;

    // Skip if user already has a day role and this is also a day role
    if (isDayRole) {
      const hasDayRole = (localAssignments[user.id] || []).some(a => DAY_ROLES.includes(a.role));
      if (hasDayRole) continue;
    }

    // Check time overlap — no overlaps allowed
    const busy = userBusy[user.id] || [];
    const hasOverlap = busy.some(b => b.includes("-") && slotsOverlap(b, timeSlot));
    if (hasOverlap) continue;

    const localSlots = (localAssignments[user.id] || [])
      .filter(a => !DAY_ROLES.includes(a.role) && a.timeSlot.includes("-"))
      .map(a => a.timeSlot);
    const hasLocalOverlap = localSlots.some(s => slotsOverlap(s, timeSlot));
    if (hasLocalOverlap) continue;

    // For reserve: don't assign someone already on reserve
    if (isReserve) {
      const alreadyReserve = (localAssignments[user.id] || []).some(a => RESERVE_ROLES.includes(a.role));
      if (alreadyReserve) continue;
    }

    // Night gender pairing: at night, pairs (same role+slot) must be same gender
    if (tableType === "guard" && isNightSlot(timeSlot)) {
      // Find others already assigned to this exact role+slot
      const partnersInSlot = Object.entries(localAssignments)
        .filter(([uid, assgns]) => uid !== user.id && assgns.some(a => a.role === role && a.timeSlot === timeSlot))
        .map(([uid]) => users.find(u => u.id === uid))
        .filter(Boolean) as EligibleUser[];
      if (partnersInSlot.length > 0) {
        const partnerIsFemale = isFemaleByRoom(partnersInSlot[0].roomNumber);
        const candidateIsFemale = isFemaleByRoom(user.roomNumber);
        if (partnerIsFemale !== candidateIsFemale) continue; // must be same gender
      }
    }

    // אופק must-pair: only assign to multi-person roles so he has a partner
    if (tableType === "guard") {
      const rule = getPersonalRule(user.name);
      if (rule?.type === "no-night-must-pair") {
        const count = MULTI_PERSON_ROLES[role] || 1;
        if (count < 2 && !DAY_ROLES.includes(role)) continue; // skip single-person roles
      }
    }

    return user;
  }

  return null;
}
