import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      personalId: true,
      team: true,
      roomNumber: true,
      phone: true,
      role: true,
      roleTitle: true,
    },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  const data = users.map((u) => ({
    "שם": u.name,
    "אימייל (שם משתמש)": u.email,
    "סיסמה (מספר אישי)": u.personalId || "dotan2026",
    "צוות": u.team,
    "חדר": u.roomNumber,
    "טלפון": u.phone,
    "תפקיד": u.role === "admin" ? "מנהל" : u.role === "commander" ? u.roleTitle || "מפקד" : "חייל",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "נתוני התחברות");

  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // name
    { wch: 30 }, // email
    { wch: 12 }, // password
    { wch: 8 },  // team
    { wch: 8 },  // room
    { wch: 15 }, // phone
    { wch: 20 }, // role
  ];

  const outPath = "./users-login-list.xlsx";
  XLSX.writeFile(wb, outPath);
  console.log(`Generated ${outPath} with ${users.length} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
