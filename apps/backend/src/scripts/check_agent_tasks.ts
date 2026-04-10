
import { prisma } from '../lib/prisma';

async function main() {
  const workspaceId = 'cmkgxq0u50000w51gn96tfzxo';
  
  console.log(`Checking tasks in workspace ${workspaceId}...`);
  const tasks = await prisma.agentTask.findMany({
    where: { workspaceId: workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('Tasks:', JSON.stringify(tasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
