import type { IntegrationProviderId } from '@agentflox/types/integrationCatalog';
import { IntegrationAuthError } from './credentialVault';

/** Block Google integration usage for non-test users until CASA/public rollout. */
export function assertGoogleIntegrationAllowed(
  userId: string,
  providerId: IntegrationProviderId,
): void {
  if (!providerId.startsWith('google_')) return;
  if (process.env.GOOGLE_INTEGRATION_PUBLIC === 'true') return;

  const allowlist = (process.env.GOOGLE_INTEGRATION_TEST_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.includes(userId)) return;

  throw new IntegrationAuthError(
    'Google integrations are in beta pending OAuth verification. ' +
      'Reconnect after approval or ask an admin to add your user id to GOOGLE_INTEGRATION_TEST_USER_IDS.',
  );
}
