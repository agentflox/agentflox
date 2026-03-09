export interface WebhookHandlerConfig {
  topic: string;
  handler: (shop: string, payload: any) => Promise<void>;
}

export interface WebhookRegistrationResult {
  success: boolean;
  result?: {
    webhookId?: number | string;
    topic: string;
    address?: string;
  };
}

export interface AppSubscriptionPayload {
  app_subscription: {
    name: string;
    status: string;
    admin_graphql_api_id: string;
    created_at?: string;
    updated_at?: string;
  };
}

export interface AppUninstallationPayload {
  id?: string;
}


