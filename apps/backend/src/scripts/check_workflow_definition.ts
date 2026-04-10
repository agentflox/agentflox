
import { prisma } from '../lib/prisma';

async function main() {
  const workflowId = 'fcc71015-34c6-494d-9e48-4194083613b6';
  const workflow = await prisma.agentWorkflow.findUnique({ where: { id: workflowId } });
  console.log('Workflow definition:', JSON.stringify(workflow?.definition, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
