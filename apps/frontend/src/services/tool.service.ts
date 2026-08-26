import { sendBackendRequest } from '@/utils/backend-request';

const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:3002';

export const toolService = {
  tools: {
    builder: {
      initialize: (data: {
        conversationId?: string;
        toolId?: string;
        skipWelcome?: boolean;
      }, session?: any) => {
        const url = data.toolId
          ? `/v1/tools/${data.toolId}/builder/initialize`
          : `/v1/tools/new/builder/initialize`;
        return sendBackendRequest(url, {
          method: 'POST',
          body: JSON.stringify(data),
        }, session);
      },

      message: (data: {
        conversationId: string;
        toolId: string;
        message: string;
        contexts?: Array<{ type: string; id: string }>;
        mentions?: Array<{ id: string; name: string; type: string }>;
        attachments?: Array<{ type: string; filename: string; content?: string }>;
        modelId?: string | null;
      }, session?: any) =>
        sendBackendRequest(`/v1/tools/${data.toolId}/builder/message`, {
          method: 'POST',
          body: JSON.stringify(data),
        }, session),

      messageStreamUrl: (toolId: string): string =>
        `${BACKEND_URL}/v1/tools/${toolId}/builder/message-stream`,

      updateDraft: (data: {
        conversationId: string;
        toolId: string;
        draft: any;
      }, session?: any) =>
        sendBackendRequest(`/v1/tools/${data.toolId}/builder/update-draft`, {
          method: 'POST',
          body: JSON.stringify(data),
        }, session),

      launch: (data: {
        conversationId: string;
        toolId: string;
      }, session?: any) =>
        sendBackendRequest(`/v1/tools/${data.toolId}/builder/launch`, {
          method: 'POST',
          body: JSON.stringify(data),
        }, session),
    },

    getSystemTools: (session?: any) =>
      sendBackendRequest('/v1/tools/system-tools', {
        method: 'GET',
      }, session),
  }
};
