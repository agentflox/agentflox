const { PrismaClient } = require('./src/generated/prisma');
const p = new PrismaClient();

async function main() {
    const agentIds = [
        '3e58b43d-4cf2-46bb-a58d-cf00e1e4120f',  // Blog Creator
        '3241770f-aa5c-4a73-a464-fb39c1c493ba',  // Content Review Agent
    ];

    for (const id of agentIds) {
        const agent = await p.aiAgent.findUnique({
            where: { id },
            select: {
                id: true, name: true, agentType: true,
                systemPrompt: true,
                tools: { select: { id: true, name: true } },
            }
        });
        if (!agent) { console.log('Agent not found:', id); continue; }
        console.log('\n=== AGENT:', agent.name, '===');
        console.log('Type:', agent.type);
        console.log('Tools:', agent.tools.map(t => t.name));
        console.log('System prompt (first 800 chars):');
        console.log(agent.systemPrompt?.substring(0, 800));
        console.log('---');
    }

    // Also look at the last execution context more carefully
    const exec = await p.agentWorkflowExecution.findFirst({
        where: { id: '73576b0b-bffa-4363-a6be-ffa54bc83f54' },
        select: { context: true }
    });

    if (exec) {
        console.log('\n=== FULL STEP RESULTS ===');
        const ctx = exec.context;
        const steps = ctx?.steps || {};
        // Blog creator step
        const blogCreator = steps['agentNode-1780905341965'];
        console.log('\nBlog Creator result (full):');
        console.log(typeof blogCreator?.result === 'string' ? blogCreator.result.substring(0, 2000) : JSON.stringify(blogCreator?.result)?.substring(0, 2000));

        const reviewer = steps['agentNode-1780905402769'];
        console.log('\nContent Review result (full):');
        console.log(typeof reviewer?.result === 'string' ? reviewer.result.substring(0, 2000) : JSON.stringify(reviewer?.result)?.substring(0, 2000));
    }
}

main().catch(console.error).finally(() => p.$disconnect());
