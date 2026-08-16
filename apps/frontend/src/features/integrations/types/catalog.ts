/** Response shape for integration catalog (shared by API route + hook). */
export type IntegrationCatalogResponse = {
  schemaVersion: string;
  platform: {
    openai: boolean;
    anthropic: boolean;
  };
  providers: Array<{
    providerId: string;
    displayName: string;
    verified: boolean;
    isConnected: boolean;
    accountsCount: number;
    accounts: Array<{
      id: string;
      providerAccountId: string;
      primaryLabel: string;
      secondaryLabel: string | null;
      avatarUrl: string | null;
    }>;
    actions: Array<{
      actionId: string;
      displayName: string;
      description: string;
      verified: boolean;
      toolName: string;
    }>;
  }>;
};

export const INTEGRATION_CATALOG_QUERY_KEY = ['integration', 'catalog'] as const;
