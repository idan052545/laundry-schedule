import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create washing machines
  const washers = [
    { name: "מכבסה 1", type: "washer" },
    { name: "מכבסה 2", type: "washer" },
    { name: "מכבסה 3", type: "washer" },
  ];

  // Create dryers
  const dryers = [
    { name: "מייבש 1", type: "dryer" },
    { name: "מייבש 2", type: "dryer" },
  ];

  for (const machine of [...washers, ...dryers]) {
    await prisma.machine.upsert({
      where: { id: machine.name },
      update: {},
      create: machine,
    });
  }

  console.log("Seed completed: 3 washers + 2 dryers created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
