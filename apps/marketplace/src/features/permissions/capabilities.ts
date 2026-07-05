export enum Capability {
    // Task Management
    TASK_CREATE = 'task:create',
    TASK_DELETE = 'task:delete',
    TASK_ASSIGN = 'task:assign',

    // Agent Automation
    AGENT_CREATE = 'agent:create',
    AGENT_EXECUTE = 'agent:execute',
    AGENT_APPROVE_DESTRUCTIVE = 'agent:approve_destructive',

    // Marketplace
    MARKETPLACE_LIST_ITEM = 'marketplace:list_item',
    MARKETPLACE_REQUEST_JOIN = 'marketplace:request_join',
    MARKETPLACE_MANAGE_REQUESTS = 'marketplace:manage_requests',

    // Content & Communication
    CONTENT_POST = 'content:post',
    CONTENT_COMMENT = 'content:comment',

    // Administrative
    MANAGE_MEMBERS = 'manage:members',
    MANAGE_BILLING = 'manage:billing',
}
