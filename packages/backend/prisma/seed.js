const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create sample pickup points
  const pickupPoints = [
    {
      name: "KTU Getfund Office",
      phone: "0201234567",
      region: "Greater Accra Region",
      school: "KTU",
      location: "Getfund",
      isActive: true
    },
    {
      name: "KTU Ceremonial Grounds",
      phone: "0201234568",
      region: "Greater Accra Region",
      school: "KTU",
      location: "Ceremonial Grounds",
      isActive: true
    },
    {
      name: "KNUST Getfund Office",
      phone: "0201234569",
      region: "Ashanti Region",
      school: "KNUST",
      location: "Getfund",
      isActive: true
    },
    {
      name: "KNUST Ceremonial Grounds",
      phone: "0201234570",
      region: "Ashanti Region",
      school: "KNUST",
      location: "Ceremonial Grounds",
      isActive: true
    }
    // Add more pickup points as needed
  ];

  for (const point of pickupPoints) {
    await prisma.pickupPoint.create({
      data: point
    });
  }

  console.log('Sample pickup points created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 