import { sendBackendRequest } from '@/utils/backend-request';


const BACKEND_URL = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:3002';

/**
 * Backend API endpoints
 */
export const agentService = {
    agents: {
        execute: (data: {
            executionId: string;
            agentId: string;
            inputData?: any;
            executionContext?: any;
        }, session?: any) =>

            sendBackendRequest('/v1/agents/execute', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        getExecutions: (agentId: string, params?: {
            page?: number;
            pageSize?: number;
            status?: string;
        }, session?: any) => {
            const query = new URLSearchParams();
            if (params?.page) query.set('page', params.page.toString());
            if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
            if (params?.status) query.set('status', params.status);

            return sendBackendRequest(
                `/v1/agents/${agentId}/executions?${query.toString()}`,
                { method: 'GET' },
                session
            );
        },

        getExecution: (agentId: string, executionId: string, session?: any) =>
            sendBackendRequest(
                `/v1/agents/${agentId}/executions/${executionId}`,
                { method: 'GET' },
                session
            ),

        cancelExecution: (agentId: string, executionId: string, session?: any) =>
            sendBackendRequest(
                `/v1/agents/${agentId}/cancel/${executionId}`,
                { method: 'POST' },
                session
            ),

        chat: (data: {
            userId: string;
            agentId: string;
            message: string;
            conversationId?: string;
            context?: {
                projects?: string[];
                teams?: string[];
                tasks?: string[];
            };
        }, session?: any) =>
            sendBackendRequest('/v1/agents/chat', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        approveExecution: (data: {
            executionId: string;
            userId: string;
            approved: boolean;
            reason?: string;
        }, session?: any) =>
            sendBackendRequest('/v1/agents/approve-execution', {
                method: 'POST',
                body: JSON.stringify(data),
            }, session),

        workforces: {
            run: (workforceId: string, data: { task?: string; input?: Record<string, unknown> }, session?: any) =>
                sendBackendRequest(`/v1/agents/workforces/${workforceId}/run`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),
        },

        // Agent Builder endpoints
        builder: {
            initialize: (data: {
                conversationId?: string;
                agentId?: string;
                skipWelcome?: boolean;
            }, session?: any) => {
                const url = data.agentId
                    ? `/v1/agents/${data.agentId}/builder/initialize`
                    : `/v1/agents/new/builder/initialize`;
                return sendBackendRequest(url, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session);
            },

            message: (data: {
                conversationId: string;
                agentId: string;
                message: string;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/builder/message`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            /**
             * Returns the SSE URL for streaming progress events.
             * The caller is responsible for reading the raw fetch (not via TRPC)
             * because TRPC mutations do not support streaming responses.
             */
            messageStreamUrl: (agentId: string): string =>
                `${BACKEND_URL}/v1/agents/${agentId}/builder/message-stream`,

            updateDraft: (data: {
                conversationId: string;
                agentId: string;
                draft: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/builder/update-draft`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            launch: (data: {
                conversationId: string;
                agentId: string;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/builder/launch`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),
        },

        // Operator endpoints
        operator: {
            initialize: (data: {
                conversationId?: string;
                agentId: string;
                skipWelcome?: boolean;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/operator/initialize`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            message: (data: {
                conversationId: string;
                agentId: string;
                message: string;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/operator/message`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            chat: (data: {
                agentId: string;
                message: string;
                workspaceId?: string;
                conversationId?: string;
                context?: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/operator/chat`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            apply: (data: {
                agentId: string;
                patch: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/operator/apply`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            execute: (data: {
                agentId: string;
                inputData?: any;
                executionContext?: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/operator/execute`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),
        },

        // Executor endpoints
        executor: {
            initialize: (data: {
                conversationId?: string;
                agentId: string;
                skipWelcome?: boolean;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/executor/initialize`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            message: (data: {
                conversationId: string;
                agentId: string;
                message: string;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/executor/message`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            chat: (data: {
                agentId: string;
                message: string;
                conversationId?: string;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/executor/chat`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            execute: (data: {
                agentId: string;
                inputData?: any;
                executionContext?: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/${data.agentId}/executor/execute`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),
        },

        // Builder View endpoints
        builderView: {
            getBuilderData: (agentId: string, session?: any) =>
                sendBackendRequest(`/v1/agents/builder-view/${agentId}`, {
                    method: 'GET',
                }, session),

            update: (agentId: string, data: {
                updates: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/builder-view/${agentId}/update`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            assistant: (agentId: string, data: {
                message: string;
                conversationHistory?: Array<{ role: string; content: string }>;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/builder-view/${agentId}/assistant`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),

            validate: (agentId: string, session?: any) =>
                sendBackendRequest(`/v1/agents/builder-view/${agentId}/validate`, {
                    method: 'GET',
                }, session),

            getVersions: (agentId: string, session?: any) =>
                sendBackendRequest(`/v1/agents/builder-view/${agentId}/versions`, {
                    method: 'GET',
                }, session),

            restoreVersion: (agentId: string, data: {
                versionId: string;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/builder-view/${agentId}/restore-version`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),
        },

        // Chat View endpoints
        chatView: {
            getWelcomeMessage: (agentId: string, session?: any) =>
                sendBackendRequest(`/v1/agents/chat-view/${agentId}/welcome`, {
                    method: 'GET',
                }, session),

            getChatContext: (agentId: string, session?: any) =>
                sendBackendRequest(`/v1/agents/chat-view/${agentId}/context`, {
                    method: 'GET',
                }, session),

            chat: (agentId: string, data: {
                message: string;
                conversationId?: string;
                workspaceId?: string;
                context?: any;
            }, session?: any) =>
                sendBackendRequest(`/v1/agents/chat-view/${agentId}/chat`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                }, session),
        },

        getSystemTools: (session?: any) =>
            sendBackendRequest('/v1/agents/system-tools', {
                method: 'GET',
            }, session),
    },
};
