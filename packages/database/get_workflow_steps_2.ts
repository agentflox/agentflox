import { PrismaClient } from '../../packages/database/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const execution = await prisma.agentWorkflowExecution.findFirst({
        orderBy: { startTime: 'desc' },
        include: { workflow: true }
    });
    
    if (!execution) return console.log("no execution");
    
    const def = execution.workflow.definition as any;
    console.log(JSON.stringify(def.steps, null, 2));

    const toolId = def.steps.find((s: any) => s.id.startsWith('toolNode')).toolId;
    const tool = await prisma.compositeTool.findUnique({ where: { id: toolId }});
    console.log("\nTOOL SCHEMA:");
    console.log(JSON.stringify(tool?.functionSchema, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
