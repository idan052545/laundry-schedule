import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Read xlsx for civilian emails
  const wb = XLSX.readFile("../פלוגת דותן - שימור ידע.xlsx");
  const ws = wb.Sheets["גיליון1"];
  const data: Record<string, string>[] = XLSX.utils.sheet_to_json(ws);

  // Build email map: name -> civilian email
  const emailMap = new Map<string, string>();
  for (const row of data) {
    const name = (row["שם הצוער (שם פרטי + שם משפחה)"] || "").trim();
    const email = (row["מייל אישי (אזרחי)"] || "").trim().toLowerCase();
    if (name && email) {
      emailMap.set(name, email);
    }
  }

  const users = await prisma.user.findMany();
  let updated = 0;

  for (const user of users) {
    const civilianEmail = emailMap.get(user.name);

    // Password = personal ID (מספר אישי), fallback to phone last 4, then default
    let password: string;
    if (user.personalId) {
      password = user.personalId;
    } else if (user.phone) {
      password = user.phone.slice(-4);
    } else {
      password = "dotan2026";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updateData: Record<string, string> = { password: hashedPassword };
    if (civilianEmail) {
      updateData.email = civilianEmail;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log(`${user.name} | email: ${civilianEmail || user.email} | password: ${password}`);
    updated++;
  }

  console.log(`\nUpdated ${updated} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
