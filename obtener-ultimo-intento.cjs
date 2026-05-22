const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const intent = await prisma.mercadoPagoPaymentIntent.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!intent) {
    console.error("NO_INTENT");
    process.exit(1);
  }

  console.log(intent.publicId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
