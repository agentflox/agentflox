import { prisma } from './index';

async function main() {
    const workforceId = 'cmn89sx1c0001surc6oswe19n';
    const wf = await (prisma as any).aiWorkforce.findUnique({
        where: { id: workforceId },
        select: { mode: true }
    });
    console.log('Workforce mode:', wf?.mode);
}

main().finally(() => (prisma as any).$disconnect());
