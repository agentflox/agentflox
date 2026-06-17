const { PrismaClient } = require('./src/generated/prisma');
const p = new PrismaClient();

async function main() {
    // List recent workforces
    const all = await p.workforce.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true }
    });
    console.log('=== WORKFORCES ===');
    console.log(JSON.stringify(all, null, 2));

    // Try to find the test workforce
    const wf = await p.workforce.findFirst({
        where: {
            OR: [
                { id: 'test-workforce-all-nodes-1' },
                { name: { contains: 'Full Node' } }
            ]
        },
        select: { id: true, name: true, data: true }
    });

    if (!wf) {
        console.log('\nTest workforce not found');
        return;
    }

    console.log('\n=== WORKFORCE:', wf.name, '===');
    const d = wf.data;
    const graph = d.workforce_graph || d.react_flow_graph;
    if (graph) {
        console.log('Nodes:');
        (graph.nodes || []).forEach(n => {
            console.log(' -', n.node_id || n.id, '| type:', n.type, '| agentId:', n.config?.agentId, '| taskId:', n.config?.taskId);
        });
        console.log('Edges:');
        (graph.edges || []).forEach(e => {
            console.log(' -', e.source_node_id || e.source, '->', e.target_node_id || e.target);
        });
    }

    // Get the last execution
    const exec = await p.agentWorkflowExecution.findFirst({
        where: { workflow: { name: { contains: wf.name } } },
        orderBy: { startTime: 'desc' },
        select: { id: true, status: true, context: true, startTime: true }
    });
    if (exec) {
        console.log('\n=== LAST EXECUTION ===', exec.id, exec.status);
        const ctx = exec.context;
        if (ctx && ctx.steps) {
            Object.entries(ctx.steps).forEach(([stepId, stepData]) => {
                console.log('\n  Step:', stepId);
                const s = stepData;
                console.log('  Status:', s.status);
                const res = s.result;
                if (typeof res === 'string') console.log('  Result (str):', res.substring(0, 300));
                else if (res) console.log('  Result:', JSON.stringify(res).substring(0, 300));
            });
        }
    }
}

main().catch(console.error).finally(() => p.$disconnect());
