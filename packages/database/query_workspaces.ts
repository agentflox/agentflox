
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmkdvej3n0000w57cnvfjud6o';
    
    console.log('\n--- Workspaces ---');
    const workspaces = await prisma.workspace.findMany({ where: { ownerId: userId } });
    console.log(JSON.stringify(workspaces.map(w => ({ id: w.id, name: w.name })), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
