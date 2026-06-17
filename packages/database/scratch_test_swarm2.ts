import { prisma } from './index';
import { randomUUID } from 'crypto';
import { swarmOrchestrationService } from '../../apps/backend/src/services/agents/orchestration/swarmOrchestrationService';

async function main() {
    const workforceId = 'cmn89sx1c0001surc6oswe19n';
    const workforce = await (prisma as any).workforce.findUnique({ where: { id: workforceId } });
    
    if (!workforce) {
        console.error('Workforce not found');
        return;
    }

    const sessionId = randomUUID();
    
    const data = (workforce.data as any) || {};
    const nodes: any[] = data.react_flow_graph?.nodes || data.workforce_graph?.nodes || (workforce.graph as any)?.nodes || [];
    const agentNodes = nodes.filter((n: any) => n.type === 'agentNode' || n.type === 'agent');
    
    const coordinatorId = agentNodes[0]?.data?.agentId || agentNodes[0]?.config?.agentId || agentNodes[0]?.id || agentNodes[0]?.node_id || 'coordinator';
    const agentIds = agentNodes.map((n: any) => n.data?.agentId || n.config?.agentId || n.id || n.node_id).filter(Boolean);

    console.log(`Starting swarm with coordinator ${coordinatorId} and agents ${agentIds}`);

    try {
        const sid = await swarmOrchestrationService.startSwarm(
            workforce.workspaceId,
            coordinatorId,
            sessionId,
            { agentIds },
        );
        console.log('Swarm started successfully with ID:', sid);
    } catch (err) {
        console.error('Service error:', err);
    }
}

main().finally(() => (prisma as any).$disconnect());
