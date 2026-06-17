const { PrismaClient } = require('./src/generated/prisma');
const p = new PrismaClient();
async function main() {
  const wf = await p.workforce.findFirst({
    where: { id: 'test-workforce-all-nodes-1' },
    include: {
      workforceSteps: {
        include: { assignedAgent: { include: { tools: true } } },
        orderBy: { order: 'asc' }
      }
    }
  });
  if (!wf) { console.log('NOT FOUND'); return; }
  console.log('Workforce:', wf.name);
  wf.workforceSteps.forEach(function(s) {
    const agent = s.assignedAgent;
    console.log('Step ' + s.order + ': ' + s.name + ' | agent: ' + (agent ? agent.name : 'none') + ' | systemPrompt length: ' + (agent && agent.systemPrompt ? agent.systemPrompt.length : 0));
  });

  // Also check last 2 executions
  const execs = await p.agentExecution.findMany({
    where: { workforceId: 'test-workforce-all-nodes-1' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, status: true, output: true, error: true, createdAt: true, agentId: true }
  });
  console.log('\nLast executions:');
  execs.forEach(function(e) {
    console.log('  id=' + e.id + ' status=' + e.status + ' agentId=' + e.agentId);
    if (e.output) console.log('  output:', JSON.stringify(e.output).slice(0, 200));
    if (e.error) console.log('  error:', e.error.slice(0, 300));
  });
}
main().catch(console.error).finally(function() { p.$disconnect(); });
