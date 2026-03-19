import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPushToUsers, sendPushToAll } from "@/lib/push";

// Helper: get tomorrow's date string YYYY-MM-DD in Israel timezone
function getTomorrowDate(): string {
  const now = new Date();
  const israelNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  israelNow.setDate(israelNow.getDate() + 1);
  const y = israelNow.getFullYear();
  const m = (israelNow.getMonth() + 1).toString().padStart(2, "0");
  const d = israelNow.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: get today's date in Israel timezone
function getTodayDate(): string {
  const now = new Date();
  const israelNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const y = israelNow.getFullYear();
  const m = (israelNow.getMonth() + 1).toString().padStart(2, "0");
  const d = israelNow.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: check if registration is still open (before 21:00 Israel time)
function isRegistrationOpen(): boolean {
  const now = new Date();
  const israelHour = parseInt(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }));
  return israelHour < 21;
}

// Helper: check if user is נעמה (קארית) or admin
async function isChopalAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, roleTitle: true },
  });
  return (
    user?.name === "נעמה לוי" ||
    user?.roleTitle?.includes("קא\"רית") ||
    user?.roleTitle?.includes("קארית") ||
    user?.email === "ohad@dotan.com" ||
    user?.role === "admin"
  );
}

// GET: Fetch chopal requests for a date
// ?date=YYYY-MM-DD (admin can query any date, regular users get tomorrow)
// ?admin=true — returns all requests grouped by team (admin only)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const isAdmin = await isChopalAdmin(userId);
  const adminView = searchParams.get("admin") === "true";
  const dateParam = searchParams.get("date");

  const tomorrowDate = getTomorrowDate();
  const targetDate = (isAdmin && dateParam) ? dateParam : tomorrowDate;

  if (adminView && !isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  if (adminView) {
    // Admin view: all requests for the date with user info
    const requests = await prisma.chopalRequest.findMany({
      where: { date: targetDate },
      include: {
        user: { select: { id: true, name: true, team: true, image: true, phone: true } },
        assignment: { select: { id: true, assignedTime: true, status: true, rejectReason: true } },
      },
      orderBy: [{ user: { team: "asc" } }, { user: { name: "asc" } }],
    });

    // Group by team
    const byTeam: Record<number, typeof requests> = {};
    for (const req of requests) {
      const team = req.user.team || 0;
      if (!byTeam[team]) byTeam[team] = [];
      byTeam[team].push(req);
    }

    return NextResponse.json({
      date: targetDate,
      requests,
      byTeam,
      total: requests.length,
      isAdmin: true,
    });
  }

  // Regular user view: check own request for tomorrow
  const myRequest = await prisma.chopalRequest.findUnique({
    where: { userId_date: { userId, date: tomorrowDate } },
    include: {
      assignment: { select: { id: true, assignedTime: true, status: true, rejectReason: true } },
    },
  });

  return NextResponse.json({
    date: tomorrowDate,
    myRequest,
    isOpen: isRegistrationOpen(),
    isAdmin,
  });
}

// POST: Submit chopal request (register for tomorrow)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  if (!isRegistrationOpen()) {
    return NextResponse.json(
      { error: "ההרשמה נסגרה ב-21:00. פנה/י לממ\"שים/נעמה למענה." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { note } = body;

  const tomorrowDate = getTomorrowDate();

  // Upsert — update if already exists
  const chopalRequest = await prisma.chopalRequest.upsert({
    where: { userId_date: { userId, date: tomorrowDate } },
    update: { needed: true, note: note || null },
    create: { userId, date: tomorrowDate, needed: true, note: note || null },
    include: { user: { select: { name: true, team: true } } },
  });

  // Notify נעמה that someone registered
  const admins = await prisma.user.findMany({
    where: {
      OR: [
        { roleTitle: { contains: "קא\"רית" } },
        { roleTitle: { contains: "קארית" } },
        { name: "נעמה לוי" },
      ],
    },
    select: { id: true },
  });

  if (admins.length > 0) {
    await sendPushToUsers(
      admins.map((a) => a.id),
      {
        title: "מסדר חופ\"ל",
        body: `${chopalRequest.user.name} נרשם/ה לחופ\"ל למחר`,
        url: "/chopal/admin",
        tag: `chopal-${tomorrowDate}`,
      }
    );
  }

  return NextResponse.json(chopalRequest);
}

// DELETE: Cancel chopal request
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  // Check ownership or admin
  const req = await prisma.chopalRequest.findUnique({ where: { id } });
  if (!req) {
    return NextResponse.json({ error: "בקשה לא נמצאה" }, { status: 404 });
  }

  const isAdmin = await isChopalAdmin(userId);
  if (req.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.chopalRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PUT: Admin actions (export / notify)
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const isAdmin = await isChopalAdmin(userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json();
  const { action, date, message } = body;
  const targetDate = date || getTomorrowDate();

  // Notify all soldiers to register
  if (action === "notify") {
    const notifMessage = message || `תזכורת: הירשמו למסדר חופ"ל למחר עד 21:00`;
    await sendPushToAll({
      title: 'מסדר חופ"ל',
      body: notifMessage,
      url: "/chopal",
      tag: `chopal-remind-${targetDate}`,
    });
    return NextResponse.json({ success: true });
  }

  // Notify specific non-registered users
  if (action === "notify-missing") {
    const registered = await prisma.chopalRequest.findMany({
      where: { date: targetDate },
      select: { userId: true },
    });
    const registeredIds = new Set(registered.map((r) => r.userId));
    const allUsers = await prisma.user.findMany({
      where: { role: "user" },
      select: { id: true },
    });
    const missingIds = allUsers.filter((u) => !registeredIds.has(u.id)).map((u) => u.id);

    if (missingIds.length > 0) {
      await sendPushToUsers(missingIds, {
        title: 'מסדר חופ"ל',
        body: `לא נרשמת למסדר חופ"ל למחר! הירשם/י עד 21:00`,
        url: "/chopal",
        tag: `chopal-remind-${targetDate}`,
      });
    }

    return NextResponse.json({ success: true, notified: missingIds.length });
  }

  // Default: export data
  const requests = await prisma.chopalRequest.findMany({
    where: { date: targetDate },
    include: {
      user: { select: { name: true, team: true, phone: true, roomNumber: true } },
    },
    orderBy: [{ user: { team: "asc" } }, { user: { name: "asc" } }],
  });

  const rows = requests.map((r) => ({
    שם: r.user.name,
    צוות: r.user.team || "-",
    טלפון: r.user.phone || "-",
    חדר: r.user.roomNumber || "-",
    הערה: r.note || "-",
    "זמן הרשמה": new Date(r.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
  }));

  return NextResponse.json({ date: targetDate, rows, total: rows.length });
}
