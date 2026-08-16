import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getIntegrationCatalog } from '@/server/integrationCatalog/getIntegrationCatalog';

export const runtime = 'nodejs';

/** Lightweight catalog endpoint — avoids compiling the full tRPC router on first integrations load. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await getIntegrationCatalog(session.user.id);
  return NextResponse.json(result);
}
