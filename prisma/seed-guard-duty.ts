import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Name → ID mapping from database
const USERS: Record<string, string> = {
  "אוהד אבדי": "ac6f3f3a-e6a4-4af5-936a-f60c7e15ac77",
  "אופק מזור": "34b695f5-cf17-40e8-b65a-c9ddd7b17f41",
  "אורי חדד": "4ca82861-4657-45f2-89d3-0de9844fc1e7",
  "אייל מוזר": "4ee3dc2b-ac02-447d-866d-0e22e2aa2557",
  "איתן אונגר": "a52ff8b7-0038-4c4d-a102-4a381a0ddfd8",
  "אלה בן גיא": "6d293184-4dba-4842-98f2-7b151345d85a",
  "אלה פלד": "213c135b-f16b-4cf3-9d9b-51f1656b103b",
  "אלון": "e472d64e-7c28-4d6d-98ab-d6c7ca787613", // אלון זלנפרוינד
  "אלון זלנפרוינד": "e472d64e-7c28-4d6d-98ab-d6c7ca787613",
  "דולב כהן": "6503aafd-7047-43d5-a721-f997bd87c2c0",
  "דור קיפגן": "2948933e-87ea-4ae7-93ee-9e322eed338a",
  "דור מנשה קיפגן": "2948933e-87ea-4ae7-93ee-9e322eed338a",
  "דנה פרידמן": "c1fb3278-f29f-416a-af63-d1dbb0e30f00",
  "הגרה שווגר": "893e1bcf-4c17-4825-899d-240fc144779c",
  "הודיה יעקבי": "7d67392d-ecb4-41f0-a2c0-596770028947",
  "הילה פינצי": "f306ad34-609c-4f27-a2fa-9053113af1b0",
  "הללי בר יוסף": "d1bd6687-06d6-434e-87b5-a836d17a298e",
  "ורוורה טופן": "e44dead1-47e0-4f4f-ae26-2bb0f32b86eb",
  "טל הנגבי": "e26fba35-3a2a-4c9b-b2ef-e3e60fd38c37",
  "טליה פרסט": "9632d252-d92d-43d0-a4cf-3af2b6fea3e6",
  "יהונתן אבוקרט": "fd8cf396-0061-4f61-a651-77c3ee098925",
  "יהלי כוכבא": "388b1542-57e7-420d-9f82-93a60dce31c1",
  "יהלי לוי": "986cdf1c-8382-413f-9035-ab152878365d",
  "יזן כנעאן": "27ead692-83ca-4b04-84cf-34427ab3bfca",
  "יניב גופמן": "032f6e9f-b2bc-4763-81ec-8dd2e82944b5",
  "יעל שושן": "fdf62152-8881-4b10-9f2c-11e14ae14590",
  "יערה רחוביצקי": "803fb107-a8b6-4078-8b58-d469b0543d81",
  "כפיר ברמן": "d88df087-2ef9-402e-ac28-208e004806a5",
  "כרמל מורן": "492ee756-f467-473d-8b3d-15a28bc76363",
  "ליאורה אייזק": "fe920033-ebfc-4805-99c3-0363cdbc2815",
  "לייה אלון": "d1f62839-0f87-489d-9ee1-38cae2f08430",
  "מאי אילארי": "1919aa05-7719-4460-8155-f1d29de84e5f",
  "מאי צימרמן": "9e4fdf30-472f-48b8-9394-698e0d282e98",
  "מיקה חיים": "8adb6897-f91c-4edf-939e-691ac8449f54",
  "מעיין מרדכי": "6c7755e0-92e8-4b91-b0b3-1b458e202c45",
  "נועה בלפור": "8ad1e0cc-e1aa-421c-91fa-f94ab4ce894a",
  "נועה גלמן": "abd089a6-455d-4d6c-b75e-dbf43d92ec9e",
  "נטע וילונסקי": "5167b8a7-b578-4776-aff7-f99cb89a2171",
  "נעם שילה": "4042a64e-e064-4a93-94e0-33fc30b133c2",
  "נעמה לביא": "357b38a0-6339-4ff6-926b-e77ac7350599",
  "עדי ויינשטיין": "b4b9fb16-e509-4642-8e2d-38c391ed781e",
  "עדן בחרוף": "a596abac-4f38-489b-9f52-ae5a140070a6",
  "עידן סימנטוב": "3b361044-2aa8-46a1-b4ae-1347cb4f8000",
  "עידן חן סימנטוב": "3b361044-2aa8-46a1-b4ae-1347cb4f8000",
  "עידן טורקיה": "8e5cf2ba-3ad3-4c3c-95b5-c92c7144bc04",
  "עילי גולדשטיין": "773972c7-4e25-4e4f-be6b-72353de138cc",
  "עילי בן אברהם": "9704ccdf-288e-445a-b51c-80f49ab586b9",
  "שילת נוימן": "fb903ba1-ede9-4936-b7c2-771169274e86",
  "עמית שושנה": "52e256b3-86e9-4e56-a0f4-fc99ee3e1be9",
  "עמנואל נמרודי": "70a6d2cf-6eb5-4701-87f3-ccd7aa09a663",
  "ענבר שלח": "f1533996-0040-43f2-894e-ddbceb51d5d9",
  "פיונה פנג": "536d6be3-f2c1-4572-9b21-0ef86088e76c",
  "רוני מאירסון": "a54a8298-c8fc-4338-a48d-66fe6649f76d",
  "רועי דדון": "693e4a08-d78c-4e64-b0bd-816872e9bc40",
  "רותם כוכבי": "f7689c9a-9270-41b4-a815-38cb3778bf05",
  "רננה ישראלוב": "ada2ec68-5449-4b75-be6c-dbc47a890c62",
  "רעות ניר": "e6add6d0-5aa0-423d-97ea-c88b9e6bd464",
  "שיר סויסה": "59ef5354-6fef-4a15-97f2-9958aaf8adaa",
  "שני זידמן": "77024c25-0b82-4caa-94c4-219e42d04ebe",
  "תמר נגר": "25f6f94c-bf5f-4fa2-bd5e-717d1aa83f1b",
  "יניב": "032f6e9f-b2bc-4763-81ec-8dd2e82944b5", // alias for יניב גופמן
  "יערה": "803fb107-a8b6-4078-8b58-d469b0543d81", // alias for יערה רחוביצקי
};

function u(name: string): string {
  const id = USERS[name];
  if (!id) throw new Error(`User not found: ${name}`);
  return id;
}

async function main() {
  const DATE = "2026-03-18";

  // ═══════════════════════════════════════════
  // TABLE 1: שיבוץ לשמירות (Guard duty)
  // ═══════════════════════════════════════════
  const guardRoles = [
    "שג רכוב קדמי", "שג רכוב אחורי", "שג רגלי", "פטל",
    'ימ"ח', "בונקר", "נשקייה", "תצפיתן", "עתודה", 'כ"כא', 'כ"כב',
  ];
  const guardSlots = [
    "09:00-12:00", "12:00-16:00", "16:00-20:00",
    "20:00-00:00", "00:00-04:00", "04:00-08:00",
  ];

  // Delete existing for this date
  const existing = await prisma.dutyTable.findUnique({ where: { date_type: { date: DATE, type: "guard" } } });
  if (existing) {
    await prisma.dutyAppeal.deleteMany({ where: { tableId: existing.id } });
    await prisma.dutyAssignment.deleteMany({ where: { tableId: existing.id } });
    await prisma.dutyTable.delete({ where: { id: existing.id } });
  }

  // Squads (חולייות) data
  const squads = [
    { number: 1, members: ["מעיין מרדכי", "ורוורה טופן", "כפיר ברמן"] },
    { number: 2, members: ["עידן סימנטוב", "אופק מזור", "רעות ניר"] },
    { number: 3, members: ["יזן כנעאן", "עילי בן אברהם", "יהלי כוכבא"] },
    { number: 4, members: ["יהלי לוי", "אלה בן גיא", "שילת נוימן"] },
  ];

  const guardTable = await prisma.dutyTable.create({
    data: {
      date: DATE,
      type: "guard",
      title: "שיבוץ לשמירות",
      roles: JSON.stringify(guardRoles),
      timeSlots: JSON.stringify(guardSlots),
      metadata: JSON.stringify({ squads }),
    },
  });

  // Guard assignments: { slot, role, name, note? }
  type GA = { slot: string; role: string; name: string; note?: string };
  const guardData: GA[] = [
    // 09:00-12:00
    { slot: "09:00-12:00", role: "שג רכוב קדמי", name: "אייל מוזר" },
    { slot: "09:00-12:00", role: "שג רכוב קדמי", name: "הללי בר יוסף" },
    { slot: "09:00-12:00", role: "שג רכוב אחורי", name: "עמית שושנה" },
    { slot: "09:00-12:00", role: "שג רגלי", name: "טל הנגבי" },
    { slot: "09:00-12:00", role: "פטל", name: "נעמה לביא" },
    { slot: "09:00-12:00", role: 'ימ"ח', name: "כפיר ברמן" },
    { slot: "09:00-12:00", role: "בונקר", name: "מאי צימרמן" },
    { slot: "09:00-12:00", role: "נשקייה", name: "רננה ישראלוב" },
    { slot: "09:00-12:00", role: "תצפיתן", name: "דולב כהן" },
    { slot: "09:00-12:00", role: "עתודה", name: "אלון" },
    { slot: "09:00-12:00", role: 'כ"כא', name: "נעם שילה" },
    { slot: "09:00-12:00", role: 'כ"כב', name: "יהלי לוי" },

    // 12:00-16:00
    { slot: "12:00-16:00", role: "שג רכוב קדמי", name: "אופק מזור" },
    { slot: "12:00-16:00", role: "שג רכוב קדמי", name: "ורוורה טופן" },
    { slot: "12:00-16:00", role: "שג רכוב אחורי", name: "רוני מאירסון" },
    { slot: "12:00-16:00", role: "שג רגלי", name: "עמנואל נמרודי" },
    { slot: "12:00-16:00", role: "פטל", name: "אלה פלד" },
    { slot: "12:00-16:00", role: 'ימ"ח', name: "אורי חדד" },
    { slot: "12:00-16:00", role: "בונקר", name: "תמר נגר" },
    { slot: "12:00-16:00", role: "נשקייה", name: "ליאורה אייזק" },
    { slot: "12:00-16:00", role: "תצפיתן", name: "רעות ניר" },
    { slot: "12:00-16:00", role: "עתודה", name: "עילי גולדשטיין" },
    { slot: "12:00-16:00", role: 'כ"כא', name: "תמר נגר" },
    { slot: "12:00-16:00", role: 'כ"כב', name: "רותם כוכבי" },

    // 16:00-20:00
    { slot: "16:00-20:00", role: "שג רכוב קדמי", name: "יזן כנעאן" },
    { slot: "16:00-20:00", role: "שג רכוב קדמי", name: "איתן אונגר" },
    { slot: "16:00-20:00", role: "שג רכוב אחורי", name: "שני זידמן", note: "16:00-20:00" },
    { slot: "16:00-20:00", role: "שג רכוב אחורי", name: "אלה בן גיא", note: "17:00-20:00" },
    { slot: "16:00-20:00", role: "שג רגלי", name: "רועי דדון", note: "16:00-19:00" },
    { slot: "16:00-20:00", role: "פטל", name: "פיונה פנג" },
    { slot: "16:00-20:00", role: 'ימ"ח', name: "יערה רחוביצקי" },
    { slot: "16:00-20:00", role: "בונקר", name: "נעם שילה" },
    { slot: "16:00-20:00", role: "נשקייה", name: "דור קיפגן" },
    { slot: "16:00-20:00", role: "תצפיתן", name: "ענבר שלח" },
    { slot: "16:00-20:00", role: "עתודה", name: "יניב" },
    { slot: "16:00-20:00", role: 'כ"כא', name: "לייה אלון" },
    { slot: "16:00-20:00", role: 'כ"כב', name: "אלה פלד" },

    // 20:00-00:00
    { slot: "20:00-00:00", role: "שג רכוב קדמי", name: "יהונתן אבוקרט" },
    { slot: "20:00-00:00", role: "שג רכוב קדמי", name: "עידן סימנטוב" },
    { slot: "20:00-00:00", role: "שג רכוב אחורי", name: "נועה גלמן" },
    { slot: "20:00-00:00", role: "שג רכוב אחורי", name: "הילה פינצי" },
    { slot: "20:00-00:00", role: "פטל", name: "נטע וילונסקי" },
    { slot: "20:00-00:00", role: 'ימ"ח', name: "רותם כוכבי" },
    { slot: "20:00-00:00", role: "בונקר", name: "יעל שושן" },
    { slot: "20:00-00:00", role: "נשקייה", name: "הגרה שווגר" },
    { slot: "20:00-00:00", role: "תצפיתן", name: "כרמל מורן" },
    { slot: "20:00-00:00", role: "עתודה", name: "מאי צימרמן" },
    { slot: "20:00-00:00", role: 'כ"כא', name: "טליה פרסט" },
    { slot: "20:00-00:00", role: 'כ"כב', name: "יערה" },

    // 00:00-04:00
    { slot: "00:00-04:00", role: "שג רכוב קדמי", name: "מעיין מרדכי" },
    { slot: "00:00-04:00", role: "שג רכוב קדמי", name: "נועה בלפור" },
    { slot: "00:00-04:00", role: "שג רכוב אחורי", name: "מיקה חיים" },
    { slot: "00:00-04:00", role: "שג רכוב אחורי", name: "שיר סויסה" },
    { slot: "00:00-04:00", role: "פטל", name: "עדן בחרוף" },
    { slot: "00:00-04:00", role: 'ימ"ח', name: "לייה אלון" },
    { slot: "00:00-04:00", role: "בונקר", name: "יהלי כוכבא" },
    { slot: "00:00-04:00", role: "נשקייה", name: "אלון" },
    { slot: "00:00-04:00", role: "תצפיתן", name: "עידן טורקיה" },
    { slot: "00:00-04:00", role: "עתודה", name: "עמית שושנה" },
    { slot: "00:00-04:00", role: "עתודה", name: "אייל מוזר" },
    { slot: "00:00-04:00", role: 'כ"כא', name: "נעמה לביא" },
    { slot: "00:00-04:00", role: 'כ"כב', name: "עדן בחרוף" },

    // 04:00-08:00
    { slot: "04:00-08:00", role: "שג רכוב קדמי", name: "דנה פרידמן" },
    { slot: "04:00-08:00", role: "שג רכוב קדמי", name: "הודיה יעקבי" },
    { slot: "04:00-08:00", role: "שג רכוב אחורי", name: "יניב", note: "04:00-08:00" },
    { slot: "04:00-08:00", role: "שג רכוב אחורי", name: "כפיר ברמן", note: "04:00-05:00" },
    { slot: "04:00-08:00", role: "שג רגלי", name: "אוהד אבדי", note: "07:00-08:00" },
    { slot: "04:00-08:00", role: "פטל", name: "יהלי לוי" },
    { slot: "04:00-08:00", role: 'ימ"ח', name: "טליה פרסט" },
    { slot: "04:00-08:00", role: "בונקר", name: "עילי גולדשטיין" },
    { slot: "04:00-08:00", role: "נשקייה", name: "עדי ויינשטיין" },
    { slot: "04:00-08:00", role: "תצפיתן", name: "מאי אילארי" },
    { slot: "04:00-08:00", role: "עתודה", name: "רעות ניר" },
  ];

  const guardAssignments = guardData.map(a => ({
    tableId: guardTable.id, userId: u(a.name), timeSlot: a.slot, role: a.role, note: a.note || null,
  }));

  await prisma.dutyAssignment.createMany({ data: guardAssignments });
  console.log(`✅ Guard table created with ${guardAssignments.length} assignments`);

  // ═══════════════════════════════════════════
  // TABLE 2: עב"ס בהד"י (OBS duty)
  // ═══════════════════════════════════════════
  const obsRoles = ["08:30-11:30", "13:30-17:30", "18:30-20:00"];
  const obsSlots = Array.from({ length: 20 }, (_, i) => String(i + 1));

  const existingObs = await prisma.dutyTable.findUnique({ where: { date_type: { date: DATE, type: "obs" } } });
  if (existingObs) {
    await prisma.dutyAppeal.deleteMany({ where: { tableId: existingObs.id } });
    await prisma.dutyAssignment.deleteMany({ where: { tableId: existingObs.id } });
    await prisma.dutyTable.delete({ where: { id: existingObs.id } });
  }

  const obsTable = await prisma.dutyTable.create({
    data: {
      date: DATE,
      type: "obs",
      title: 'עב"ס בהד"י במהלך הגנ"מ',
      roles: JSON.stringify(obsRoles),
      timeSlots: JSON.stringify(obsSlots),
      metadata: JSON.stringify({
        obsGdudi: ["אלה בן גיא", "עידן טורקיה", "הילה פינצי"],
      }),
    },
  });

  // עב"ס data: [slotNumber, 18:30-20:00 person, 13:30-17:30 person, 08:30-11:30 person]
  const obsData: [string, string, string, string][] = [
    ["1", "הללי בר יוסף", "אייל מוזר", "יזן כנעאן"],
    ["2", "כפיר ברמן", "עמית שושנה", "איתן אונגר"],
    ["3", "רננה ישראלוב", "טל הנגבי", "שני זידמן"],
    ["4", "טל הנגבי", "מאי צימרמן", "ענבר שלח"],
    ["5", "רעות ניר", "רותם כוכבי", "פיונה פנג"],
    ["6", "ליאורה אייזק", "דולב כהן", "יערה"],
    ["7", "אלון", "יהונתן אבוקרט", "מעיין מרדכי"],
    ["8", "אורי חדד", "נועה בלפור", "דור קיפגן"],
    ["9", "מיקה חיים", "יעל שושן", "רועי דדון"],
    ["10", "מאי אילארי", "עידן סימנטוב", "כרמל מורן"],
    ["11", "רוני מאירסון", "יהלי כוכבא", "הגרה שווגר"],
    ["12", "הודיה יעקבי", "אלון", "אוהד אבדי"],
    ["13", "אופק מזור", "כרמל מורן", "יהלי לוי"],
    ["14", "אלה פלד", "רננה ישראלוב", "נטע וילונסקי"],
    ["15", "יהלי כוכבא", "עדן בחרוף", "נועה גלמן"],
    ["16", "עדי ויינשטיין", "אוהד אבדי", "הילה פינצי"],
    ["17", "עילי גולדשטיין", "נועה גלמן", "יהונתן אבוקרט"],
    ["18", "עמנואל נמרודי", "עידן טורקיה", "עידן סימנטוב"],
    ["19", "דנה פרידמן", "הללי בר יוסף", "שיר סויסה"],
    ["20", "ורוורה טופן", "כפיר ברמן", "רותם כוכבי"],
  ];

  const obsAssignments = obsData.flatMap(([slot, col1, col2, col3]) => [
    { tableId: obsTable.id, userId: u(col1), timeSlot: slot, role: "18:30-20:00" },
    { tableId: obsTable.id, userId: u(col2), timeSlot: slot, role: "13:30-17:30" },
    { tableId: obsTable.id, userId: u(col3), timeSlot: slot, role: "08:30-11:30" },
  ]);

  await prisma.dutyAssignment.createMany({ data: obsAssignments });
  console.log(`✅ OBS table created with ${obsAssignments.length} assignments`);

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
