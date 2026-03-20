import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Dotan2026!";

const SAGAL = [
  { name: "אביה רויטברג", email: "avia250000@gmail.com", roleTitle: "מפקדת פלוגה", team: null },
  { name: "נטע וקנין", email: "neta055v@gmail.com", roleTitle: 'מפק"צ 16', team: 16 },
  { name: "נעמה לוי", email: "naama2004levy@gmail.com", roleTitle: 'מפק"צ 17', team: 17 },
  { name: "קרן לנדאו", email: "klandau100@gmail.com", roleTitle: 'מפק"צ 15', team: 15 },
  { name: "תהל קוור", email: "tahelk234@gmail.com", roleTitle: 'מפק"צ 14', team: 14 },
];

async function main() {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const s of SAGAL) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: s.email },
        data: { role: "sagal", roleTitle: s.roleTitle, team: s.team, mustChangePassword: true },
      });
      console.log(`Updated existing user ${s.name} (${s.email}) -> sagal`);
    } else {
      await prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          password: hashed,
          role: "sagal",
          roleTitle: s.roleTitle,
          team: s.team,
          mustChangePassword: true,
        },
      });
      console.log(`Created ${s.name} (${s.email}) as sagal — ${s.roleTitle}`);
    }
  }

  console.log(`\nDefault password: ${DEFAULT_PASSWORD}`);
  console.log("Users will be prompted to change password on first login.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
