/**
 * Capability Provider
 *
 * Routes tool executions to the appropriate specialized executors.
 * This is the central dispatch point for all agent capabilities.
 */

import { executeContentCreationTool } from '../execution/contentCreationExecutor';
import { executeCodeOperationTool } from '../execution/codeOperationsExecutor';
import { executeBrowserAutomationTool } from '../execution/browserAutomationExecutor';
import { executeMediaGenerationTool } from '../execution/mediaGenerationExecutor';
import { executeFileOperationTool } from '../execution/fileOperationsExecutor';
import { executeAgentOrchestrationTool } from '../execution/agentOrchestrationExecutor';
import { executeTaskManagementTool } from '../execution/taskManagementExecutor';
import { executeApiIntegrationTool } from '../execution/apiIntegrationExecutor';
import { prisma } from '@/lib/prisma';

export const capabilityProvider = {
    /**
     * Execute a tool by name with given parameters
     */
    async execute(toolName: string, params: any, userId: string, workspaceId?: string): Promise<any> {
        console.log(`[CapabilityProvider] Executing tool: ${toolName} for user: ${userId}`);

        // Some tools are implemented directly in the registry or here for simplicity,
        // but most are delegated to specialized executors.

        // 0. Task Management
        const taskTools = ['createTask', 'updateTask', 'deleteTask', 'listTasks', 'getTask', 'assignTask', 'retrieveTaskList'];
        if (taskTools.includes(toolName)) {
            return executeTaskManagementTool(toolName, params, userId, workspaceId);
        }

        // 1. Content Creation
        const contentTools = ['generateBlogPost', 'writeScript', 'createDocumentation'];
        if (contentTools.includes(toolName)) {
            return executeContentCreationTool(toolName, params, userId, workspaceId);
        }

        // 2. Code Operations
        const codeTools = ['generateCode', 'reviewCode', 'editCode', 'runTests', 'analyzeRepo'];
        if (codeTools.includes(toolName)) {
            return executeCodeOperationTool(toolName, params, userId);
        }

        // 3. Browser Automation
        const browserTools = ['searchWeb', 'scrapeUrl', 'clickElement', 'fillForm', 'captureScreenshot'];
        if (browserTools.includes(toolName)) {
            return executeBrowserAutomationTool(toolName, params, userId);
        }

        // 4. Media Generation
        const mediaTools = ['generateImage', 'editImage', 'generateVideo', 'generateAudio'];
        if (mediaTools.includes(toolName)) {
            return executeMediaGenerationTool(toolName, params, userId);
        }

        // 5. File Operations
        const fileTools = ['readLocalFile', 'writeLocalFile', 'listDirectory', 'deleteFile'];
        if (fileTools.includes(toolName)) {
            return executeFileOperationTool(toolName, params, userId);
        }

        // 6. Agent Orchestration (Hierarchical/Swarm)
        const orchestrationTools = ['assignTaskToAgent', 'sendMessageToAgent', 'getAvailableSwarmTasks', 'triggerWorkflow'];
        if (orchestrationTools.includes(toolName)) {
            return executeAgentOrchestrationTool(toolName, params, userId, workspaceId);
        }

        // 7. API Integrations (HTTP, Webhook, OpenAI, Anthropic)
        const apiIntegrationTools = [
            'httpRequest',
            'webhookSend',
            'openaiChat',
            'openaiEmbedding',
            'openaiModeration',
            'openaiImage',
            'anthropicChat',
        ];
        if (apiIntegrationTools.includes(toolName)) {
            return executeApiIntegrationTool(toolName, params, userId, workspaceId);
        }

        // 8. Fallback: surface clear error for unmapped tools
        throw new Error(`Capability not found for tool: ${toolName}`);
    }
};

