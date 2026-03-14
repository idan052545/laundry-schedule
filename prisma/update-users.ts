import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Data from the xlsx - mapped by name
const userData: Record<string, {
  personalId?: string;
  phone?: string;
  team?: number;
  birthDate?: string;
  foodPreference?: string;
  allergies?: string;
  medicalExemptions?: string;
  otherExemptions?: string;
  civilEmail?: string;
}> = {
  "אוהד אבדי": { personalId: "9351505", phone: "0558824527", team: 17, birthDate: "01.10.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: 'כ"מ 2', otherExemptions: "זקן צרפתי", civilEmail: "ohad9623@gmail.com" },
  "נעם שילה": { personalId: "9345422", phone: "0526631405", team: 17, birthDate: "14.05.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", civilEmail: "Noamshilo10@gmail.com" },
  "יובל ישר": { personalId: "9692159", phone: "0584985058", team: 17, birthDate: "29.07.2007", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", otherExemptions: "זקן צרפתי", civilEmail: "yasharyuval10@gmail.com" },
  "יהונתן אבוקרט": { personalId: "9433520", phone: "0543836063", team: 17, birthDate: "10.12.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", otherExemptions: "זקן מלא", civilEmail: "yhonatan5913@gmail.com" },
  "דור מנשה קיפגן": { personalId: "8507348", phone: "0586748688", team: 17, birthDate: "06.11.1999", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", otherExemptions: "זקן צרפתי", civilEmail: "dorm732@gmail.com" },
  "טל הנגבי": { personalId: "9379869", phone: "0552250525", team: 17, birthDate: "10.01.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2 - אסטמה", civilEmail: "Talushhanegbi@gmail.com" },
  "רועי דדון": { personalId: "9395097", phone: "0525988918", team: 17, birthDate: "04.05.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", otherExemptions: "זקן צרפתי", civilEmail: "Roidadon991@gmail.com" },
  "הגרה שווגר": { personalId: "9180598", phone: "0535315557", team: 17, birthDate: "09.08.2004", foodPreference: "ללא", allergies: "ללא", medicalExemptions: 'כ"מ 2', civilEmail: "hagara.schwager@gmail.com" },
  "עידן טורקיה": { personalId: "9423591", phone: "0503376225", team: 17, birthDate: "09.10.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", otherExemptions: "זקן מלא + שיער", civilEmail: "idant95@gmail.com" },
  "נגה ברק": { personalId: "9530304", phone: "0535050505", team: 17, birthDate: "16.08.2006", foodPreference: "ללא", allergies: "אבק", medicalExemptions: "כמ 2 + חומרי ניקיון", civilEmail: "Nogabarak2@gmail.com" },
  "אלה פלד": { personalId: "9419715", phone: "0527071407", team: 16, birthDate: "20.08.2005", foodPreference: "צליאק", allergies: "ללא", civilEmail: "Peled.e.20@gmail.com" },
  "אורי חדד": { personalId: "9713314", phone: "0545271266", team: 16, birthDate: "11.06.2007", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 1", otherExemptions: "זקן מלא", civilEmail: "orihadad2007@gmail.com" },
  "עילי גולדשטיין": { personalId: "9257449", phone: "0506502772", team: 16, birthDate: "22.07.2004", foodPreference: "צמחוני", allergies: "ללא", otherExemptions: "זקן מלא", civilEmail: "ilaykey@gmail.com" },
  "הילה פינצי": { personalId: "9652742", phone: "0544271331", team: 16, birthDate: "18.12.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "hillafin@gmail.com" },
  "רוני מאריסון": { personalId: "9413145", phone: "0548323585", team: 16, birthDate: "30.12.2005", foodPreference: "צמחונית", allergies: "ללא", civilEmail: "roni.meirson@gmail.com" },
  "ליאורה אייזק": { personalId: "9451890", phone: "0584143838", team: 17, birthDate: "01.04.2006", foodPreference: "טבעונית", allergies: "ללא", medicalExemptions: "כמ2", civilEmail: "lioraizsak@gmail.com" },
  "נועה בלפור": { personalId: "9390128", phone: "0559771379", team: 16, birthDate: "22.02.2005", foodPreference: "ללא", allergies: "ללא", civilEmail: "Noa.balfour@gmail.com" },
  "עידן סימנטוב": { personalId: "9075187", phone: "0525458493", team: 16, birthDate: "27.06.2003", foodPreference: "ללא", allergies: "ללא", civilEmail: "idan052545@gmail.com" },
  "דנה פרידמן": { personalId: "9529116", phone: "0586267598", team: 15, birthDate: "09.09.2006", foodPreference: "צמחוני", allergies: "ללא", medicalExemptions: "כמ 1", civilEmail: "fridmandana189@gmail.com" },
  "נטע וילונסקי": { personalId: "9378176", phone: "0587002302", team: 16, birthDate: "23.02.2005", foodPreference: "צמחונית", allergies: "ללא", civilEmail: "nettawielunski@gmail.com" },
  "רננה ישראלוב": { personalId: "9369390", phone: "0502859111", team: 17, birthDate: "11.12.2005", foodPreference: "ללא", allergies: "אבק", medicalExemptions: "כמ 2", civilEmail: "israelovrenana@gmail.com" },
  "הללי בר יוסף": { personalId: "9574392", phone: "0523360301", team: 15, birthDate: "03.01.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "Halleliby@gmail.com" },
  "הודיה יעקובי": { personalId: "9361923", phone: "0543944481", team: 15, birthDate: "20.12.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "פטור משקל", civilEmail: "hodayayakobi@gmail.com" },
  "מאי אילארי": { personalId: "9624875", phone: "0542131528", team: 15, birthDate: "16.05.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "פטור משקל", civilEmail: "mayilary@gmail.com" },
  "נועה גלמן": { personalId: "9497489", phone: "0587782888", team: 16, birthDate: "28.06.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "noa1.gelman@gmail.com" },
  "אופק מזור": { personalId: "9538466", phone: "0558819568", team: 15, birthDate: "10.11.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 1 + שמירות לילה + ניווטי לילה + קרב מגע", civilEmail: "ofekmazorek@gmail.com" },
  "איתן אונגר": { personalId: "9296359", phone: "0584704717", team: 15, birthDate: "02.06.2004", foodPreference: "ללא", allergies: "ללא", civilEmail: "Erangers22@gmail.com" },
  "כפיר ברמן": { personalId: "9277951", phone: "0505815266", team: 14, birthDate: "20.06.2004", foodPreference: "ללא", allergies: "ללא", civilEmail: "Kfir2727@gmail.com" },
  "כרמל מורן": { personalId: "9330305", phone: "0585651818", team: 14, birthDate: "24.09.2005", foodPreference: "ללא", allergies: "ללא", civilEmail: "Carmel6530@gmail.com" },
  "עמנואל נמרודי": { personalId: "9391594", phone: "0549577777", team: 17, birthDate: "07.05.2005", foodPreference: "צמחוני", allergies: "ללא", medicalExemptions: "כמ 2", civilEmail: "Emnimrodi@gmail.com" },
  "ענבר שלח": { personalId: "9391443", phone: "0502202857", team: 14, birthDate: "02.05.2005", foodPreference: "ללא", allergies: "ללא", civilEmail: "Inbar879@gmail.com" },
  "שילת נוימן": { personalId: "9346959", phone: "0584896070", team: 15, birthDate: "04.09.2005", foodPreference: "ללא", allergies: "ללא", civilEmail: "Shilatnoy05@gmail.com" },
  "יזן כנעאן": { personalId: "9570550", phone: "0509700593", team: 14, birthDate: "09.02.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 0 + 1", otherExemptions: "זקן מלא", civilEmail: "yazankenaan@gmail.com" },
  "רעות ניר": { personalId: "9448464", phone: "0587886382", team: 14, birthDate: "31.08.2006", foodPreference: "ללא", allergies: "ללא", otherExemptions: "נשיאת משקל", civilEmail: "Reutnir9@gmail.com" },
  "רוני קרפט": { personalId: "9555602", phone: "0522282317", team: 14, birthDate: "27.04.2006", foodPreference: "צמחונים", allergies: "ללא", civilEmail: "Kraftroni@gmail.com" },
  "אייל מזור": { personalId: "9338360", phone: "0523344007", team: 14, birthDate: "25.03.2005", foodPreference: "ללא", allergies: "ללא", civilEmail: "mozer.eyal@gmail.com" },
  "עדן בחרוף": { personalId: "9221859", phone: "0548754057", team: 16, birthDate: "02.02.2004", foodPreference: "ללא", allergies: "ללא", civilEmail: "Bbajaroff@gmail.com" },
  "רותם כוכבי": { personalId: "9497453", phone: "0522736003", team: 14, birthDate: "27.06.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "Rotemkochavi27@gmail.com" },
  "אלון זלנפרויד": { personalId: "9219963", phone: "0533406328", team: 17, birthDate: "11.11.2004", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2 - אסטמה", otherExemptions: "זקן מלא", civilEmail: "Alonseel@gmail.com" },
  "עדי ולנשטיין": { personalId: "9336308", phone: "0542225007", team: 17, birthDate: "09.02.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 2", otherExemptions: "זקן מלא", civilEmail: "Adi92005@gmail.com" },
  "יניב גופמן": { personalId: "9363335", phone: "0535259538", team: 15, birthDate: "18.10.2005", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "אמל", otherExemptions: "זקן", civilEmail: "yanivgofman@gmail.com" },
  "דולב כהן": { personalId: "9227516", phone: "0542542104", team: 14, birthDate: "01.04.2004", foodPreference: "ללא", allergies: "ללא", medicalExemptions: 'כ"מ 2 - אסטמה', otherExemptions: "זקן מלא", civilEmail: "sukcfvi13@gmail.com" },
  "שני זידמן": { personalId: "9506588", phone: "0543548854", team: 15, birthDate: "05.04.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 1", civilEmail: "Shani.zaidman.2006@gmail.com" },
  "מיקה חיים": { personalId: "9722790", phone: "0543263061", team: 15, birthDate: "24.05.2007", foodPreference: "ללא", allergies: "ללא", civilEmail: "Mikahaim12345@gmail.com" },
  "עילי בן אברהם": { personalId: "9530796", phone: "0584814814", team: 15, birthDate: "03.08.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: 'קמ"ג+לינה בשטח', otherExemptions: "זקן מלא", civilEmail: "illayba2016@gmail.com" },
  "יערה רחוביצקי": { personalId: "9556782", phone: "0547726335", team: 15, birthDate: "04.10.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 1 - רקם, הליכה, עמידה", civilEmail: "Yaara.rej@gmail.com" },
  "נעמה לוי": { personalId: "9619020", phone: "0549856665", team: 15, birthDate: "02.05.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "naamalavi0205@gmail.com" },
  "ליה אלון": { personalId: "9619397", phone: "0534253534", team: 14, birthDate: "09.05.2006", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "פטור משקל", civilEmail: "Liya20061144@gmail.com" },
  "מאי צימרמן": { personalId: "9469530", phone: "0544672912", team: 14, birthDate: "21.04.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "Mayzimer1974@gmail.com" },
  "אלה בן גיא": { personalId: "9327853", phone: "0586448455", team: 14, birthDate: "22.02.2005", foodPreference: "ללא", allergies: "ללא", civilEmail: "ellabenguy2225@gmail.com" },
  "תמר נגר": { personalId: "9421803", phone: "0535215616", team: 16, birthDate: "27.07.2005", foodPreference: "צמחוני", allergies: "ללא", medicalExemptions: "פטור מניווטי לילה ושמירות בלילה", civilEmail: "Tamarnagar27@gmail.com" },
  "ורווה טופן": { personalId: "9663012", phone: "0539282069", team: 15, birthDate: "20.11.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "varvaratofa@gmail.com" },
  "פיונה פונג": { personalId: "9178875", phone: "0528601984", team: 14, birthDate: "10.08.2004", foodPreference: "ללא", allergies: "ללא", civilEmail: "fionasivv@gmail.com" },
  "שיר סוויסה": { personalId: "9459947", phone: "0549063626", team: 15, birthDate: "03.07.2006", foodPreference: "ללא", allergies: "ללא", civilEmail: "shirswisa2005@gmail.com" },
  "יהלי לוי": { personalId: "9407817", phone: "0503029952", team: 16, birthDate: "27.02.2005", foodPreference: "צמחוני", allergies: "ללא", civilEmail: "yahelilevi2005@gmail.com" },
  "מעין מרדכי": { personalId: "9193974", phone: "0506358005", team: 16, birthDate: "15.09.2004", foodPreference: "ללא", allergies: "ללא", medicalExemptions: "כמ 1,0 ,פטור משקל, ופעילות ידנית מאומצת", civilEmail: "Maayan04mor@gmail.com" },
  "יהלי כוכבא": { team: 14 },
  "יעל שושן": { team: 14 },
  "עמית שושנה": { team: 15 },
  "טליה פרסט": { team: 15 },
};

async function main() {
  const users = await prisma.user.findMany();
  let updated = 0;

  for (const user of users) {
    const data = userData[user.name];
    if (!data) {
      console.log(`No data for: ${user.name}`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        personalId: data.personalId || null,
        phone: data.phone || null,
        team: data.team || null,
        birthDate: data.birthDate || null,
        foodPreference: data.foodPreference || null,
        allergies: data.allergies || null,
        medicalExemptions: data.medicalExemptions || null,
        otherExemptions: data.otherExemptions || null,
      },
    });
    console.log(`Updated: ${user.name} (team ${data.team})`);
    updated++;
  }

  // Make עידן סימנטוב an admin
  await prisma.user.updateMany({
    where: { name: "עידן סימנטוב" },
    data: { role: "admin" },
  });

  console.log(`\nDone! Updated ${updated}/${users.length} users`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
