const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.walletTransaction.updateMany({
    where: {
      type: "credit",
      reason: {
        contains: "Cashback",
      },
    },
    data: {
      source: "cashback",
    },
  });

  await prisma.walletTransaction.updateMany({
    where: {
      type: "debit",
      reason: {
        contains: "Uso de saldo",
      },
    },
    data: {
      source: "wallet_spend",
    },
  });

  console.log("Wallet actualizada: cashback separado de recargas manuales.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
