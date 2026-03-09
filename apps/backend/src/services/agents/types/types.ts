/**
 * Shared types for agent services
 */

export interface AgentState {
  userId: string;
  agentId?: string;
  message: string;
  conversationId?: string;
  workspaceId?: string;
  [key: string]: any;
}

export interface Intent {
  action: 'CREATE_AGENT' | 'UPDATE_AGENT' | 'EXECUTE_TASK' | 'PLAN_WORKFLOW' | 'CLARIFY';
  parameters: Record<string, any>;
  confidence: number;
  requiresClarification: boolean;
  clarificationQuestions?: string[];
  reasoning?: string;
}

export interface ExecutionStep {
  id: string;
  order: number;
  description: string;
  type: 'GATHER_CONTEXT' | 'VALIDATE' | 'EXECUTE' | 'CONFIRM' | 'STORE_MEMORY';
  dependencies: string[];
  estimatedTime: number;
  tool?: {
    name: string;
    parameters: Record<string, any>;
  };
  validationRules?: ValidationRule[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'ABORTED';
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionPlan {
  id: string;
  steps: ExecutionStep[];
  totalEstimatedTime: number;
  requiresApproval: boolean;
  approvalReason?: string;
  contextUsed: ContextReference[];
  createdAt: string;
}

export interface ContextReference {
  contextId: string;
  usedIn: string;
  relevanceScore: number;
  explanation: string;
}

export interface Context {
  id: string;
  type: 'WORKSPACE' | 'PROJECT' | 'TEAM' | 'TASK' | 'USER_PREFERENCE' | 'PROJECT_RULE' | 'RECENT_STATE';
  source: string;
  content: string;
  metadata: {
    relevanceScore: number;
    sourceType: string;
    sourceId: string;
    timestamp: string;
    tags?: string[];
  };
  embedding?: number[];
}

export interface ValidationRule {
  type: 'ASSIGNEE_EXISTS' | 'DATE_VALID' | 'PERMISSION_CHECK' | 'LIMIT_CHECK';
  description: string;
  validate: (context: any) => Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface Tool {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  category: 'TASK_MANAGEMENT' | 'PROJECT_MANAGEMENT' | 'USER_MANAGEMENT' | 'SEARCH' | 'CONTENT_CREATION' | 'CODE_OPERATIONS' | 'BROWSER_AUTOMATION' | 'MEDIA_GENERATION' | 'FILE_OPERATIONS' | 'API_INTEGRATION';
  isDefault: boolean;
  functionSchema: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
  deterministic: boolean;
  requiresAuth: boolean;
  rateLimit?: number;
  timeout: number;
  examples: Array<{
    input: Record<string, any>;
    output: any;
    description: string;
  }>;
}

export interface ToolCall {
  id: string;
  toolId: string;
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

// Local mirror of Prisma AgentMemoryType enum
export enum AgentMemoryType {
  SHORT_TERM = 'SHORT_TERM',
  LONG_TERM = 'LONG_TERM',
  EPISODIC = 'EPISODIC',
  SEMANTIC = 'SEMANTIC',
  PROCEDURAL = 'PROCEDURAL',
  WORKING = 'WORKING',
}

export interface Memory {
  id: string;
  agentId: string;
  memoryType: AgentMemoryType;
  category: string;
  key: string;
  content: string;
  summary?: string;
  contextType?: string;
  contextId?: string;
  associatedData?: Record<string, any>;
  embedding?: number[];
  importance: number;
  accessCount: number;
  lastAccessedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  executionId: string;
  planId: string;
  reason: string;
  actionSummary: {
    totalActions: number;
    actionTypes: string[];
    affectedResources: Array<{
      type: string;
      id: string;
      name: string;
    }>;
  };
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export enum AgentTriggerType {
  SCHEDULED = 'SCHEDULED',
  AUTOMATION = 'AUTOMATION',
  ASSIGN_TASK = 'ASSIGN_TASK',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  MENTION = 'MENTION'
}

export enum AutomationTriggerType {
  TASK_OR_SUBTASK_CREATED = 'TASK_OR_SUBTASK_CREATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_ASSIGNEE_ADDED = 'TASK_ASSIGNEE_ADDED',
  TASK_ASSIGNEE_REMOVED = 'TASK_ASSIGNEE_REMOVED',
  TASK_ASSIGNEE_CHANGED = 'TASK_ASSIGNEE_CHANGED',
  TASK_DUE_DATE_ARRIVES = 'TASK_DUE_DATE_ARRIVES',
  TASK_DUE_DATE_CHANGED = 'TASK_DUE_DATE_CHANGED',
  TASK_START_DATE_ARRIVES = 'TASK_START_DATE_ARRIVES',
  TASK_START_DATE_CHANGED = 'TASK_START_DATE_CHANGED',
  TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
  TASK_NAME_CHANGED = 'TASK_NAME_CHANGED',
  TASK_TYPE_CHANGED = 'TASK_TYPE_CHANGED',
  TASK_LINKED = 'TASK_LINKED',
  TASK_TIME_TRACKED = 'TASK_TIME_TRACKED',
  TASK_UNBLOCKED = 'TASK_UNBLOCKED',
  CUSTOM_FIELD_CHANGED = 'CUSTOM_FIELD_CHANGED',
  TAG_ADDED = 'TAG_ADDED',
  TAG_REMOVED = 'TAG_REMOVED',
  CHECKLISTS_RESOLVED = 'CHECKLISTS_RESOLVED',
  SUBTASKS_RESOLVED = 'SUBTASKS_RESOLVED',
  EXISTING_TASK_ADDED_TO_LOCATION = 'EXISTING_TASK_ADDED_TO_LOCATION',
  MOVE_TO_LIST = 'MOVE_TO_LIST',
  DATE_BEFORE_AFTER = 'DATE_BEFORE_AFTER',
  EVERY_SCHEDULED_TIME = 'EVERY_SCHEDULED_TIME',
  CHAT_MESSAGE_POSTED = 'CHAT_MESSAGE_POSTED',
  WEBHOOK = 'WEBHOOK',
}

export enum TriggerType {
  AUTOMATION = 'AUTOMATION',
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL'
}

export enum AgentType {
  TASK_EXECUTOR = 'TASK_EXECUTOR',
  WORKFLOW_MANAGER = 'WORKFLOW_MANAGER',
  DATA_ANALYST = 'DATA_ANALYST',
  CODE_GENERATOR = 'CODE_GENERATOR',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  RESEARCHER = 'RESEARCHER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  QA_TESTER = 'QA_TESTER',
  INTEGRATION = 'INTEGRATION',
  MONITORING = 'MONITORING',
  GENERAL_ASSISTANT = 'GENERAL_ASSISTANT',
  CUSTOM = 'CUSTOM'
}

export enum AgentDepartment {
  MARKETING = 'MARKETING',
  LEGAL = 'LEGAL',
  ENGINEERING = 'ENGINEERING',
  PRODUCT = 'PRODUCT',
  SALES = 'SALES',
  HR = 'HR',
  FINANCE = 'FINANCE'
}

export interface AgentRoleDefinition {
  department: AgentDepartment;
  displayName: string;
  defaultType: AgentType;
  description: string;
  capabilities: string[];
  systemPromptMixin: string;
}
