import { prisma } from './index';

async function main() {
    const id = 'cmn89sx1c0001surc6oswe19n';
    const w = await (prisma as any).workforce?.findUnique({ where: { id } });
    console.log('graph type:', typeof w.graph);
    console.log('graph nodes:', w.graph?.nodes?.length);
    console.log('graph is Array?', Array.isArray(w.graph));
}

main().finally(() => (prisma as any).$disconnect());
