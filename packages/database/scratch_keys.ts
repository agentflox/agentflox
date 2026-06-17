import { prisma } from './index';

async function main() {
    const id = 'cmn89sx1c0001surc6oswe19n';
    const w = await (prisma as any).workforce?.findUnique({ where: { id } });
    console.log('data keys:', Object.keys(w.data || {}));
    console.log('graph keys:', Object.keys(w.graph || {}));
    if (w.data?.workforce_graph) {
        console.log('workforce_graph has nodes:', Array.isArray(w.data.workforce_graph.nodes));
    }
}

main().finally(() => (prisma as any).$disconnect());
