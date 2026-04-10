import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const workspace = await prisma.workspace.findFirst({ where: { ownerId: user?.id } });
  
  console.log(JSON.stringify({ user, workspace }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
