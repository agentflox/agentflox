import { prisma } from './index';
import { randomUUID } from 'crypto';

async function main() {
    const workforceId = 'cmn89sx1c0001surc6oswe19n';
    const workforce = await (prisma as any).workforce.findUnique({ where: { id: workforceId } });
    
    if (!workforce) {
        console.error('Workforce not found');
        return;
    }

    const sessionId = randomUUID();
    
    const graph = (workforce.graph as any) || {};
    const nodes: any[] = graph?.nodes ?? [];
    const agentNodes = nodes.filter((n: any) => n.type === 'agentNode');
    const validAgentIds = agentNodes
        .map((n: any) => n.data?.agentId || n.id)
        .filter((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
    const coordinatorId = validAgentIds[0] || 'coordinator';

    console.log(`Starting swarm with coordinator ${coordinatorId} and agents ${validAgentIds}`);

    // Assuming we need to run it through the actual backend endpoint to be fully integration tested,
    // or just require the service. But the service is in apps/backend...
    console.log('Sending request to local backend...');
    try {
        const response = await fetch('http://localhost:3002/v1/agents/swarm/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Assuming we don't have auth token here, this might fail with 401.
            },
            body: JSON.stringify({ workforceId, sessionId })
        });
        const data = await response.json();
        console.log('Response:', response.status, data);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

main();
