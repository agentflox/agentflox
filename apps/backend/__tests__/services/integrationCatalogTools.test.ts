import { buildSaasIntegrationToolDefinitions } from '../../src/modules/integrations/registry/catalogTools';
import { listVerifiedCatalogActions } from '@agentflox/types/integrationCatalog';

describe('integration catalog tools', () => {
  it('registers verified GitHub actions as SAAS_INTEGRATION tools', () => {
    const tools = buildSaasIntegrationToolDefinitions();
    const names = tools.map((t) => t.name).sort();

    expect(names).toEqual(['githubApiCall', 'githubGetRepository', 'githubListRepos', 'slackPostMessage']);
    expect(tools.every((t) => t.category === 'SAAS_INTEGRATION')).toBe(true);
    expect(tools.every((t) => t.requiresAuth)).toBe(true);
  });

  it('keeps catalog action count aligned with registered tools', () => {
    const verifiedNonWebhook = listVerifiedCatalogActions().filter(
      (a) => a.providerId !== 'webhook',
    );
    expect(buildSaasIntegrationToolDefinitions()).toHaveLength(verifiedNonWebhook.length);
  });
});
