
import { prisma } from '../lib/prisma';

async function main() {
  const executionId = 'd60d5c35-eea0-4412-83da-cc2461cfe49f';
  
  console.log(`Checking execution ${executionId}...`);
  const execution = await prisma.agentWorkflowExecution.findUnique({
    where: { id: executionId },
    include: { tasks: true }
  });
  
  if (!execution) {
    console.log('Execution not found.');
  } else {
    console.log('Execution Status:', execution.status);
    console.log('Tasks:', execution.tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
