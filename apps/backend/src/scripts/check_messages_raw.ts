
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Checking last 10 AiMessages (no filter)...');
  const messages = await prisma.aiMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('Messages:', JSON.stringify(messages.map(m => ({ id: m.id, role: m.role, content: m.content ? m.content.substring(0, 50) : null })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
