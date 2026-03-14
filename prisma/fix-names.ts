import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Map DB name -> correct xlsx name
const NAME_FIXES: Record<string, string> = {
  "פיונה פונג": "פיונה פנג",
  "אלון זלנפרויד": "אלון זלנפרוינד",
  "ורווה טופן": "ורוורה טופן",
  "אייל מזור": "אייל מוזר",
  "שיר סוויסה": "שיר סויסה",
  "עדי ולנשטיין": "עדי ויינשטיין",
  "מעין מרדכי": "מעיין מרדכי",
  "הודיה יעקובי": "הודיה יעקבי",
  "רוני מאריסון": "רוני מאירסון",
  "ליה אלון": "לייה אלון",
  "עידן סימנטוב": "עידן חן סימנטוב",
  "נעמה לוי": "נעמה לביא",
};

async function main() {
  for (const [oldName, newName] of Object.entries(NAME_FIXES)) {
    const user = await prisma.user.findFirst({ where: { name: oldName } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: newName },
      });
      console.log(`Fixed: "${oldName}" -> "${newName}"`);
    } else {
      console.log(`NOT FOUND: "${oldName}"`);
    }
  }
  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
