import { prisma } from './index';

async function main() {
    const id = 'cmn89sx1c0001surc6oswe19n';
    const w = await (prisma as any).workforce?.findUnique({ where: { id } });
    console.log('workforce_graph type nodes:', w.data?.workforce_graph?.nodes?.map((n:any)=>n.type));
    console.log('react_flow_graph type nodes:', w.data?.react_flow_graph?.nodes?.map((n:any)=>n.type));
}

main().finally(() => (prisma as any).$disconnect());
