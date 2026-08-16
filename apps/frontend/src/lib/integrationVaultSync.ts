import { sign } from 'jsonwebtoken';

/**
 * Server-only: sync OAuth Account tokens into encrypted Integration.credentials via backend vault.
 */
export async function syncIntegrationVaultForUser(userId: string): Promise<{ synced: number }> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const baseUrl =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.SERVER_URL ||
    'http://127.0.0.1:3002';

  if (!secret) {
    console.warn('[integrationVaultSync] No AUTH_SECRET — skipping vault sync');
    return { synced: 0 };
  }

  const token = sign({ id: userId, sub: userId }, secret, { expiresIn: '15m' });
  const url = `${baseUrl.replace('localhost', '127.0.0.1')}/v1/integrations/sync-vault`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[integrationVaultSync] Backend sync failed:', res.status, text.slice(0, 200));
      return { synced: 0 };
    }
    const json = (await res.json()) as { synced?: number };
    return { synced: json.synced ?? 0 };
  } catch (error) {
    console.warn('[integrationVaultSync] Backend unreachable:', error);
    return { synced: 0 };
  }
}
