import { prisma } from './index';

async function main() {
    const workforceId = 'cmn89sx1c0001surc6oswe19n';
    const convs = await (prisma as any).aiConversation.findMany({
        where: {
            metadata: {
                path: ['workforceId'],
                equals: workforceId,
            }
        }
    });
    console.log('Total convs found:', convs.length);
    for (const c of convs) {
        console.log(`- ID: ${c.id}, Type: ${c.conversationType}, Title: ${c.title}`);
    }
}

main().finally(() => (prisma as any).$disconnect());
