import { prisma } from './lib/prisma';

async function run() {
    const agent = await prisma.aiAgent.findUnique({
        where: { id: '3e58b43d-4cf2-46bb-a58d-cf00e1e4120f' },
        include: { tools: true }
    });
    console.log(JSON.stringify(agent?.tools, null, 2));

    const agent2 = await prisma.aiAgent.findUnique({
        where: { id: '3241770f-aa5c-4a16-ae0e-749e75eb8cd5' },
        include: { tools: true }
    });
    console.log('Agent 2:', JSON.stringify(agent2?.tools, null, 2));

    const systemTools = await prisma.systemTool.findMany({
        where: {
            name: { in: ['searchProjects', 'findQualifiedAgents'] }
        }
    });
    console.log('System tools:', JSON.stringify(systemTools, null, 2));

    process.exit(0);
}

run();
