import { prisma } from './index';

async function main() {
    const id = 'cmn89sx1c0001surc6oswe19n';
    const w = await (prisma as any).workforce?.findUnique({ where: { id } });
    console.log(JSON.stringify(w, null, 2));
}

main().finally(() => (prisma as any).$disconnect());
