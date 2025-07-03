const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingWallets() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!existingWallet) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0.0,
        },
      });
      console.log(`Created wallet for user ${user.id}`);
    }
  }
  console.log('Wallet check complete.');
}

createMissingWallets()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
