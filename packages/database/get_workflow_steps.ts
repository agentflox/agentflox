import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const execution = await prisma.agentWorkflowExecution.findFirst({
        orderBy: { startTime: 'desc' },
        include: { workflow: true }
    });
    
    if (!execution) return console.log("no execution");
    
    const def = execution.workflow.definition as any;
    console.log(JSON.stringify(def.steps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
