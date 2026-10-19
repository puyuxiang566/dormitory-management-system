const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = "$2a$10$IB2EcIvAkEvQ8A1iahzeqeLzA6zdlxPPPdzErO9l.VRIKNoeplEq.";
  
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
  
  console.log("Admin created");
}

main().finally(() => prisma.$disconnect());
