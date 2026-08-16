/**
 * Sync SAAS_INTEGRATION + all system tools from registry to database.
 *
 * Usage: pnpm --filter @agentflox/backend integrations:sync-tools
 */
import { syncToolsToDatabase } from '../src/services/agents/registry/sync';

async function main() {
  console.log('[integrations] Syncing system tools (including SAAS_INTEGRATION)...');
  await syncToolsToDatabase();
  console.log('[integrations] Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
