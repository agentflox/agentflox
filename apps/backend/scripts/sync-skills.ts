
import { syncSkillsAndTools } from '../src/services/agents/registry/syncSkillsToDatabase';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Syncing skills and tools...');
    try {
        await syncSkillsAndTools();
        console.log('Successfully synced skills and tools');
    } catch (error) {
        console.error('Error syncing skills:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
