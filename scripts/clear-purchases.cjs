const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.purchaseInvoice.deleteMany();
  await prisma.purchaseImport.deleteMany();
  console.log("Compras eliminadas correctamente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
