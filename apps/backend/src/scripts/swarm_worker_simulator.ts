
import { agentRegistryService } from '../services/agents/orchestration/agentRegistry';
import { agentCommunicationService } from '../services/agents/orchestration/agentCommunication';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

async function main() {
    console.log('--- Starting Swarm Worker Simulator ---');
    
    // 1. Sync agents
    console.log('Syncing database agents to registry...');
    await agentRegistryService.syncDatabaseAgents();
    
    // 2. Subscribe ALL active agents to their inboxes
    const agents = await prisma.aiAgent.findMany({ 
        where: { isActive: true },
        select: { id: true, name: true }
    });
    
    console.log(`Subscribing ${agents.length} agents to reliable inboxes...`);
    for (const agent of agents) {
        await agentCommunicationService.subscribeToInbox(agent.id);
    }
    
    console.log('--- Ready and listening for messages ---');
    
    // Keep it alive
    await new Promise(() => {});
}

main().catch(console.error);
