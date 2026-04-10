
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmkdvej3n0000w57cnvfjud6o';
    const workspaceId = 'cmkgxq0u50000w51gn96tfzxo';
    const agentId = '4f192f18-6d21-44a7-b581-bb60238fc790'; // Swarm Coordinator
    const toolId = 'cmmhkb49s0001suhoemadp4ic'; // Test 1
    
    const workforceId = 'test-workforce-all-nodes-1';
    
    const nodes = [
      {
        node_id: 'trigger-1',
        type: 'trigger',
        config: { instructions: 'Start the flow' },
        metadata: { position: { x: 100, y: 100 } }
      },
      {
        node_id: 'agent-1',
        type: 'agent',
        config: { agentId: agentId },
        metadata: { position: { x: 300, y: 100 } }
      },
      {
        node_id: 'tool-1',
        type: 'tool',
        config: { toolId: toolId, agentId: agentId },
        metadata: { position: { x: 500, y: 100 } }
      },
      {
        node_id: 'task-1',
        type: 'task',
        config: { taskId: 'dummy-task', agentId: agentId },
        metadata: { position: { x: 700, y: 100 } }
      },
      {
        node_id: 'condition-1',
        type: 'condition',
        config: { instructions: 'Check if successful', agentId: agentId },
        metadata: { position: { x: 900, y: 100 } }
      }
    ];
    
    const edges = [
      { source_node_id: 'trigger-1', target_node_id: 'agent-1' },
      { source_node_id: 'agent-1', target_node_id: 'tool-1' },
      { source_node_id: 'tool-1', target_node_id: 'task-1' },
      { source_node_id: 'task-1', target_node_id: 'condition-1' }
    ];
    
    const workforceData = {
      workforce_graph: { nodes, edges },
      workforce_metadata: { name: 'Full Node Test Workforce' }
    };
    
    console.log('Upserting workforce...');
    const workforce = await prisma.workforce.upsert({
      where: { id: workforceId },
      update: {
        name: 'Full Node Test Workforce',
        description: 'Test workforce including all node types',
        workspaceId,
        createdBy: userId,
        data: workforceData as any,
        status: 'ACTIVE',
        mode: 'FLOW' 
      },
      create: {
        id: workforceId,
        name: 'Full Node Test Workforce',
        description: 'Test workforce including all node types',
        workspaceId,
        createdBy: userId,
        data: workforceData as any,
        status: 'ACTIVE',
        mode: 'FLOW'
      }
    });
    
    console.log('Workforce created/updated:', workforce.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
