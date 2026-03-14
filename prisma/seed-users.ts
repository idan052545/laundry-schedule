import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

const users: { name: string; room: string }[] = [
  // חדר 219
  { name: "רועי דדון", room: "219" },
  { name: "יובל ישר", room: "219" },
  { name: "יהונתן אבוקרט", room: "219" },
  { name: "עילי בן אברהם", room: "219" },
  { name: "עילי גולדשטיין", room: "219" },
  { name: "דולב כהן", room: "219" },

  // חדר 403
  { name: "טל הנגבי", room: "403" },
  { name: "מאי צימרמן", room: "403" },
  { name: "פיונה פונג", room: "403" },
  { name: "הילה פינצי", room: "403" },
  { name: "מיקה חיים", room: "403" },
  { name: "נועה גלמן", room: "403" },

  // חדר 307
  { name: "אופק מזור", room: "307" },
  { name: "יזן כנעאן", room: "307" },
  { name: "עדי ולנשטיין", room: "307" },
  { name: "אלון זלנפרויד", room: "307" },

  // חדר 411
  { name: "ורווה טופן", room: "411" },
  { name: "נועה בלפור", room: "411" },
  { name: "שני זידמן", room: "411" },
  { name: "רננה ישראלוב", room: "411" },
  { name: "ענבר שלח", room: "411" },
  { name: "מעין מרדכי", room: "411" },

  // חדר 217
  { name: "דור מנשה קיפגן", room: "217" },
  { name: "אייל מזור", room: "217" },
  { name: "עידן סימנטוב", room: "217" },
  { name: "יניב גופמן", room: "217" },

  // חדר 413
  { name: "יהלי לוי", room: "413" },
  { name: "רותם כוכבי", room: "413" },
  { name: "אלה פלד", room: "413" },
  { name: "יערה רחוביצקי", room: "413" },
  { name: "עדן בחרוף", room: "413" },

  // חדר 305
  { name: "כפיר ברמן", room: "305" },
  { name: "איתן אונגר", room: "305" },
  { name: "עידן טורקיה", room: "305" },
  { name: "אורי חדד", room: "305" },
  { name: "אוהד אבדי", room: "305" },

  // חדר 401
  { name: "הללי בר יוסף", room: "401" },
  { name: "כרמל מורן", room: "401" },
  { name: "יהלי כוכבא", room: "401" },
  { name: "יעל שושן", room: "401" },
  { name: "אלה בן גיא", room: "401" },
  { name: "שיר סוויסה", room: "401" },

  // חדר 405
  { name: "עמית שושנה", room: "405" },
  { name: "רוני קרפט", room: "405" },
  { name: "מאי אילארי", room: "405" },
  { name: "הודיה יעקובי", room: "405" },
  { name: "רוני מאריסון", room: "405" },
  { name: "ליאורה אייזק", room: "405" },

  // חדר 409
  { name: "דנה פרידמן", room: "409" },
  { name: "הגרה שווגר", room: "409" },
  { name: "רעות ניר", room: "409" },
  { name: "נגה ברק", room: "409" },
  { name: "נטע וילונסקי", room: "409" },
  { name: "עמנואל נמרודי", room: "409" },

  // חדר 407
  { name: "תמר נגר", room: "407" },
  { name: "ליה אלון", room: "407" },
  { name: "טליה פרסט", room: "407" },
  { name: "נעמה לוי", room: "407" },
  { name: "שילת נוימן", room: "407" },
  { name: "נעם שילה", room: "407" },
];

async function main() {
  const defaultPassword = await bcrypt.hash("123456", 10);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const initials = getInitials(user.name);
    // Generate email from name (transliterated initials + room)
    const email = `user.${user.room}.${created + 1}@laundry.app`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.user.create({
      data: {
        name: user.name,
        email,
        password: defaultPassword,
        roomNumber: user.room,
        image: null, // No photo - app will show initials
      },
    });
    console.log(`Created: ${user.name} (חדר ${user.room}) - ${initials} - ${email}`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Total: ${users.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
