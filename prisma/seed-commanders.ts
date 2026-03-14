import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMMANDERS = [
  { name: "מאי צימרמן", roleTitle: "קהדית פלוגתית" },
  { name: "טל הנגבי", roleTitle: "קצינת מבצעים פלוגתית" },
  { name: "נועה בלפור", roleTitle: "קאגית פלוגתית" },
  { name: "נעמה", roleTitle: 'קא"רית פלוגתית' },
  { name: "אוהד אבדי", roleTitle: 'סמ"פ' },
  { name: "תמר נגר", roleTitle: "קצינת אימונים" },
  { name: "אייל מוזר", roleTitle: 'קב"ט' },
  { name: "יניב גופמן", roleTitle: "קלפ חזק" },
];

async function main() {
  for (const cmd of COMMANDERS) {
    // Try to find by name (partial match)
    const user = await prisma.user.findFirst({
      where: { name: { contains: cmd.name } },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "commander", roleTitle: cmd.roleTitle },
      });
      console.log(`Updated ${user.name} -> commander (${cmd.roleTitle})`);
    } else {
      console.log(`NOT FOUND: ${cmd.name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
