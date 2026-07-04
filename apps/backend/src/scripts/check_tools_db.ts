import { prisma } from '../lib/prisma';

async function run() {
    const tools = await prisma.systemTool.findMany({
        where: {
            OR: [
                { name: 'searchProjects' },
                { name: 'findQualifiedAgents' }
            ]
        }
    });
    console.log('System Tools:', tools);

    const agentTools = await prisma.agentTool.findMany({
        where: {
            OR: [
                { name: 'searchProjects' },
                { name: 'findQualifiedAgents' }
            ]
        }
    });
    console.log('Agent Tools:', agentTools);

    process.exit(0);
}

run();
