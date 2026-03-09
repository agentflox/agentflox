import { ToolDefinition } from '../core/ToolRegistryManager';

export const AGENT_ORCHESTRATION_TOOLS: ToolDefinition[] = [
    {
        name: 'assignTaskToAgent',
        description: 'Assign a task to a specific worker agent',
        category: 'TASK_MANAGEMENT',
        isDefault: true,
        functionSchema: {
            name: 'assignTaskToAgent',
            description: 'Assigns a given task to an agent for handling',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'ID of the task to assign' },
                    agentId: { type: 'string', description: 'ID of the agent to whom the task is assigned' },
                    priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], description: 'Priority of the task execution' },
                    instructions: { type: 'string', description: 'Additional instructions for the agent' }
                },
                required: ['taskId', 'agentId']
            }
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 30,
        rateLimit: 30,
        examples: []
    },
    {
        name: 'sendMessageToAgent',
        description: 'Send a message or signal directly to another agent',
        category: 'COMMUNICATION',
        isDefault: true,
        functionSchema: {
            name: 'sendMessageToAgent',
            description: 'Sends a direct message or event payload to a worker or manager agent',
            parameters: {
                type: 'object',
                properties: {
                    agentId: { type: 'string', description: 'ID of the target agent' },
                    message: { type: 'string', description: 'The text message or payload content' },
                    type: { type: 'string', enum: ['DIRECT_MESSAGE', 'EVENT', 'COMMAND'], description: 'Type of communication' }
                },
                required: ['agentId', 'message']
            }
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 30,
        rateLimit: 60,
        examples: []
    },
    {
        name: 'getAvailableSwarmTasks',
        description: 'Retrieve a list of unassigned tasks currently in the global swarm pool',
        category: 'TASK_MANAGEMENT',
        isDefault: true,
        functionSchema: {
            name: 'getAvailableSwarmTasks',
            description: 'Gets pending tasks from the swarm pool that are ready for execution',
            parameters: {
                type: 'object',
                properties: {
                    workspaceId: { type: 'string', description: 'Optional workspace ID to filter tasks' }
                }
            }
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 20,
        rateLimit: 30,
    },
    {
        name: 'triggerWorkflow',
        description: 'Trigger a predefined multi-agent workflow',
        category: 'ORCHESTRATION',
        isDefault: true,
        functionSchema: {
            name: 'triggerWorkflow',
            description: 'Initiates a complex agent-graph workflow by ID',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: { type: 'string', description: 'ID of the workflow to trigger' },
                    inputData: { type: 'object', description: 'Initial data for the workflow' }
                },
                required: ['workflowId']
            }
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 60,
        rateLimit: 10,
        examples: []
    },
    {
        name: 'claimSwarmTask',
        description: 'Atomically claim a task from the global swarm pool to prevent duplicate execution',
        category: 'TASK_MANAGEMENT',
        isDefault: true,
        functionSchema: {
            name: 'claimSwarmTask',
            description: 'Claims a specific task for the current agent. Returns success: true if claimed successfully.',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'ID of the task to claim' }
                },
                required: ['taskId']
            }
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 20,
        rateLimit: 30,
        examples: []
    }
];
