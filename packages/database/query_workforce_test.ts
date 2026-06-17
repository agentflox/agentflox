import { PrismaClient } from './node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const wf = await prisma.workforce.findFirst({
        where: { id: 'test-workforce-all-nodes-1' },
        select: { id: true, name: true, data: true }
    });

    if (!wf) {
        // Try to find by name
        const wf2 = await prisma.workforce.findFirst({
            where: { name: { contains: 'Full Node Test' } },
            select: { id: true, name: true, data: true }
        });
        if (!wf2) {
            console.log('Not found by id or name. Listing recent:');
            const all = await prisma.workforce.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true } });
            console.log(JSON.stringify(all, null, 2));
            return;
        }
        console.log('Found by name:', wf2.id, wf2.name);
        const d = wf2.data as any;
        const graph = d?.workforce_graph || d?.react_flow_graph;
        console.log(JSON.stringify(graph, null, 2));
        return;
    }

    console.log('Found:', wf.id, wf.name);
    const d = wf.data as any;
    const graph = d?.workforce_graph || d?.react_flow_graph;
    console.log(JSON.stringify(graph, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
