import { prisma } from '../lib/prisma';

async function main() {
    const execution = await prisma.agentWorkflowExecution.findFirst({
        orderBy: { startTime: 'desc' },
        include: { workflow: true }
    });
    
    if (!execution) return console.log("no execution");
    
    if (!execution.workflow) return console.log("no workflow");

    const def = execution.workflow.definition as any;
    console.log("WORKFLOW STEPS:");
    console.log(JSON.stringify(def.steps, null, 2));

    const toolNode = def.steps.find((s: any) => s.id.startsWith('toolNode'));
    if (toolNode) {
        const tool = await prisma.compositeTool.findUnique({ where: { id: toolNode.toolId }});
        console.log("\nTOOL SCHEMA:");
        console.log(JSON.stringify(tool?.functionSchema, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
