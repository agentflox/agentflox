import { prisma } from './apps/backend/src/lib/prisma';
import { compositeToolExecutionService } from './apps/backend/src/services/agents/execution/compositeToolExecutionService';

async function main() {
    const toolId = 'tool_kvhvdd';
    console.log(`Testing tool: ${toolId}`);
    
    const tool = await prisma.compositeTool.findUnique({ where: { id: toolId } });
    if (!tool) {
        console.error(`Tool not found: ${toolId}`);
        process.exit(1);
    }
    
    console.log(`Found tool: ${tool.name}`);
    console.log('Steps config:', JSON.stringify(tool.steps, null, 2));
    console.log('Schema:', JSON.stringify(tool.functionSchema, null, 2));
    
    const result = await compositeToolExecutionService.execute(
        toolId,
        { topic: 'AI Orchestration' },
        tool.ownerId || 'system',
        (event) => {
            console.log(`[Progress] ${event.type}: ${event.content}`);
            if (event.metadata && event.metadata.result && event.metadata.result.logs) {
                console.log(`[Logs]`, event.metadata.result.logs);
            }
        }
    );
    
    console.log('\n--- FINAL EXECUTION RESULT ---');
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
