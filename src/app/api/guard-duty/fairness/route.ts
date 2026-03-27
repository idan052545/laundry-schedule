import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const RONI_NAME = "רוני קרפט";
const DAY_ROLES = ['כ"כא', 'כ"כב'];
const RESERVE_ROLES = ["עתודה"];

async function isRoni(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.name === RONI_NAME || user?.email === "ohad@dotan.com" || user?.role === "admin";
}

function parseTimeSlot(slot: string): number {
  const parts = slot.split("-");
  if (parts.length !== 2) return 0;
  const [sh, sm] = parts[0].split(":").map(Number);
  const [eh, em] = parts[1].split(":").map(Number);
  if ([sh, sm, eh, em].some(isNaN)) return 0;
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 1440;
  return (endMin - startMin) / 60;
}

/** POST — record fairness debt after auto-fill is applied */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isRoni(userId))) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { date, tables } = await req.json();
  if (!date || !tables) return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });

  // For each table type, compute per-user hours and record debt
  for (const [type, tbl] of Object.entries(tables) as [string, { assignments: { userId: string; timeSlot: string; role: string }[] }][]) {
    // Compute hours per user
    const userHours: Record<string, number> = {};
    for (const a of tbl.assignments) {
      if (DAY_ROLES.includes(a.role) || RESERVE_ROLES.includes(a.role)) continue;
      // For obs, the role IS the time range; for guard, timeSlot is the time range
      const h = parseTimeSlot(type === "obs" ? a.role : a.timeSlot);
      if (h > 0) userHours[a.userId] = (userHours[a.userId] || 0) + h;
    }

    const hoursValues = Object.values(userHours);
    if (hoursValues.length === 0) continue;
    const avg = hoursValues.reduce((s, v) => s + v, 0) / hoursValues.length;

    // Upsert fairness records for each user who got hours
    for (const [uid, hours] of Object.entries(userHours)) {
      const debt = hours - avg;
      await prisma.dutyFairness.upsert({
        where: { userId_date_type: { userId: uid, date, type } },
        create: { userId: uid, date, type, hours, avgHours: avg, debt },
        update: { hours, avgHours: avg, debt },
      });
    }
  }

  return NextResponse.json({ success: true });
}

/** GET — get accumulated fairness debt for all users */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const records = await prisma.dutyFairness.findMany({
    select: { userId: true, date: true, type: true, hours: true, avgHours: true, debt: true },
    orderBy: { date: "desc" },
  });

  // Aggregate total debt per user
  const totalDebt: Record<string, number> = {};
  for (const r of records) {
    totalDebt[r.userId] = (totalDebt[r.userId] || 0) + r.debt;
  }

  return NextResponse.json({ records, totalDebt });
}
