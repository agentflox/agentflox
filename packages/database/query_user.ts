
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmkdvej3n0000w57cnvfjud6o';
    
    console.log('--- User Info ---');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log('User:', user?.id, user?.email);

    console.log('\n--- Workspaces ---');
    const workspaces = await prisma.workspace.findMany({ where: { ownerId: userId } });
    console.log('Workspaces:', workspaces.map(w => ({ id: w.id, name: w.name })));

    console.log('\n--- Agents ---');
    const agents = await prisma.aiAgent.findMany({ where: { createdBy: userId } });
    console.log('Agents:', agents.map(a => ({ id: a.id, name: a.name })));

    console.log('\n--- Tools ---');
    const tools = await prisma.tool.findMany({ where: { ownerId: userId } });
    console.log('Tools:', tools.map(t => ({ id: t.id, name: t.name })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
