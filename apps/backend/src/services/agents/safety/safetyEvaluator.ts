/**
 * Safety Evaluator & Governance Model
 * 
 * Provides safety checks and governance enforcement for agent configurations:
 * - Prompt safety evaluation
 * - Capability whitelisting
 * - Policy compliance checking
 * - Tool access control
 */

import { AgentType, AgentTriggerType } from '../types/types';
import { getAllToolsSync } from '../registry/toolRegistry';
import { prisma } from '@/lib/prisma';

export interface SafetyResult {
  safe: boolean;
  violations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PolicyResult {
  compliant: boolean;
  violations: string[];
  requiresApproval: boolean;
}

export interface AgentDraft {
  id?: string;
  name?: string;
  description?: string;
  agentType?: AgentType | string; // Allow string for compatibility
  systemPrompt?: string;
  capabilities?: string[];
  constraints?: string[];
  tools?: Array<{ id: string; name: string; config?: any }>;
  triggers?: Array<{
    triggerType: AgentTriggerType;
    name: string;
    config: Record<string, any>;
    confidence: number;
  }>;
  permissionLevel?: 'RESTRICTED' | 'STANDARD' | 'ELEVATED' | 'ADMIN';
  [key: string]: any;
}

/**
 * Safety Evaluator - Scans prompts and configurations for safety violations
 */
export class SafetyEvaluator {
  private readonly PROHIBITED_PATTERNS = [
    /delete\s+all/i,
    /remove\s+all\s+data/i,
    /access\s+private\s+information/i,
    /bypass\s+security/i,
    /ignore\s+safety/i,
    /override\s+permissions/i,
    /execute\s+arbitrary\s+code/i,
    /system\s+command/i,
    /shell\s+command/i,
    /file\s+system\s+access/i,
    /unauthorized\s+access/i,
  ];

  /**
   * Evaluate prompt for safety violations
   */
  async evaluatePrompt(prompt: string, options?: { isSystemPrompt?: boolean }): Promise<SafetyResult> {
    const violations: string[] = [];

    if (!prompt || prompt.trim().length === 0) {
      return {
        safe: false,
        violations: ['Prompt is empty'],
        riskLevel: 'HIGH',
      };
    }

    // Check for prohibited patterns
    for (const pattern of this.PROHIBITED_PATTERNS) {
      if (pattern.test(prompt)) {
        violations.push(`Prohibited pattern detected: ${pattern.source}`);
      }
    }

    const promptLower = prompt.toLowerCase();



    // Check for dangerous instructions
    const dangerousKeywords = [
      'delete all',
      'remove all',
      'clear database',
      'drop table',
      'format disk',
      'rm -rf',
      'sudo',
      'root access',
    ];

    for (const keyword of dangerousKeywords) {
      if (promptLower.includes(keyword)) {
        violations.push(`Dangerous keyword detected: ${keyword}`);
      }
    }

    const riskLevel =
      violations.length > 2 ? 'HIGH' : violations.length > 0 ? 'MEDIUM' : 'LOW';

    return {
      safe: violations.length === 0,
      violations,
      riskLevel,
    };
  }

  /**
   * Evaluate capabilities against allowed tool sets
   */
  async evaluateCapabilities(
    capabilities: string[],
    allowedTools: string[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!capabilities || capabilities.length === 0) {
      return { valid: true, errors: [] };
    }

    // Get tool requirements for capabilities
    const toolRequirements = this.getToolRequirements(capabilities);

    for (const requiredTool of toolRequirements) {
      if (!allowedTools.includes(requiredTool)) {
        errors.push(
          `Capability requires tool '${requiredTool}' which is not allowed`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get tool requirements for given capabilities
   */
  private getToolRequirements(capabilities: string[]): string[] {
    const requirements: string[] = [];
    const capabilityLower = capabilities.map(c => c.toLowerCase());

    // Map capabilities to required tools
    if (capabilityLower.some(c => c.includes('task'))) {
      requirements.push('createTask', 'updateTask', 'assignTask');
    }

    if (capabilityLower.some(c => c.includes('user'))) {
      requirements.push('getUser', 'updateUser');
    }

    if (capabilityLower.some(c => c.includes('project'))) {
      requirements.push('createProject', 'updateProject');
    }

    if (capabilityLower.some(c => c.includes('schedule'))) {
      requirements.push('createSchedule');
    }

    return [...new Set(requirements)]; // Remove duplicates
  }
}

/**
 * Capability Whitelist - Validates capabilities against agent type
 */
export class CapabilityWhitelist {
  private readonly ALLOWED_CAPABILITIES: Record<AgentType, string[]> = {
    [AgentType.TASK_EXECUTOR]: [
      'create_task',
      'update_task',
      'assign_task',
      'complete_task',
      'delete_task',
    ],
    [AgentType.WORKFLOW_MANAGER]: [
      'create_workflow',
      'update_workflow',
      'execute_workflow',
      'monitor_workflow',
    ],
    [AgentType.DATA_ANALYST]: ['read_data', 'analyze_data', 'generate_report'],
    [AgentType.CODE_GENERATOR]: ['generate_code', 'review_code', 'refactor_code'],
    [AgentType.CONTENT_CREATOR]: [
      'create_content',
      'edit_content',
      'publish_content',
    ],
    [AgentType.CUSTOMER_SUPPORT]: [
      'respond_to_ticket',
      'escalate_ticket',
      'resolve_ticket',
    ],
    [AgentType.RESEARCHER]: ['search', 'analyze', 'summarize'],
    [AgentType.PROJECT_MANAGER]: [
      'create_project',
      'update_project',
      'assign_resources',
    ],
    [AgentType.QA_TESTER]: ['run_tests', 'report_bugs', 'verify_fixes'],
    [AgentType.INTEGRATION]: ['connect_services', 'sync_data', 'monitor_health'],
    [AgentType.MONITORING]: ['monitor_system', 'alert_on_issues', 'log_events'],
    [AgentType.GENERAL_ASSISTANT]: [
      'answer_questions',
      'provide_information',
      'assist_users',
    ],
    [AgentType.CUSTOM]: [], // Custom agents can have any capabilities
  };

  /**
   * Validate capabilities for agent type
   */
  validateCapabilities(
    agentType: AgentType | string | undefined,
    capabilities: string[]
  ): { valid: boolean; errors: string[] } {
    if (!agentType || !Object.values(AgentType).includes(agentType as AgentType)) {
      return {
        valid: false,
        errors: [`Invalid agent type: ${agentType}`],
      };
    }

    if (agentType === AgentType.CUSTOM) {
      // Custom agents can have any capabilities
      return { valid: true, errors: [] };
    }

    const allowed = this.ALLOWED_CAPABILITIES[agentType as AgentType] || [];
    const invalid = capabilities.filter(c => {
      // If it's in the strict whitelist, it's valid
      if (allowed.includes(c)) return false;

      // If it's a descriptive capability (contains spaces and is reasonably long), 
      // we allow it during the building process as it's likely inferred by the LLM
      if (c.includes(' ') && c.trim().length > 3) return false;

      // Otherwise, it's invalid
      return true;
    });

    if (invalid.length > 0) {
      return {
        valid: false,
        errors: [
          `Invalid capabilities for ${agentType}: ${invalid.join(', ')}. Allowed: ${allowed.join(', ')} or descriptive strings`,
        ],
      };
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Policy Engine - Enforces governance policies
 */
export class PolicyEngine {
  private readonly POLICIES = {
    maxTriggersPerAgent: 5,
    requiredApprovalFor: ['delete', 'modify_user', 'access_sensitive'],
    maxTokenUsagePerDay: 100000,
    minSystemPromptLength: 200,
    maxSystemPromptLength: 10000,
  };

  /**
   * Check if agent draft complies with policies
   */
  async checkCompliance(
    draft: AgentDraft,
    userId: string
  ): Promise<PolicyResult> {
    const violations: string[] = [];
    let requiresApproval = false;


    // Check trigger limit
    if (
      draft.triggers &&
      draft.triggers.length > this.POLICIES.maxTriggersPerAgent
    ) {
      violations.push(
        `Exceeds maximum triggers per agent: ${draft.triggers.length} > ${this.POLICIES.maxTriggersPerAgent}`
      );
    }

    // Check system prompt length
    if (draft.systemPrompt) {
      if (draft.systemPrompt.length < this.POLICIES.minSystemPromptLength) {
        violations.push(
          `System prompt too short: ${draft.systemPrompt.length} < ${this.POLICIES.minSystemPromptLength} characters`
        );
      }
      if (draft.systemPrompt.length > this.POLICIES.maxSystemPromptLength) {
        violations.push(
          `System prompt too long: ${draft.systemPrompt.length} > ${this.POLICIES.maxSystemPromptLength} characters`
        );
      }
    }

    // Check if approval required
    if (draft.capabilities) {
      const requiresApprovalCheck = this.POLICIES.requiredApprovalFor.some(
        action =>
          draft.capabilities!.some(c =>
            c.toLowerCase().includes(action.toLowerCase())
          )
      );

      if (requiresApprovalCheck) {
        requiresApproval = true;
        // Check if approval exists
        if (draft.id) {
          const hasApproval = await this.checkApproval(draft.id, userId);
          if (!hasApproval) {
            violations.push('Approval required for sensitive capabilities');
          }
        } else {
          violations.push('Approval required for sensitive capabilities');
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      requiresApproval,
    };
  }

  /**
   * Check if agent has required approval
   */
  private async checkApproval(
    agentId: string,
    userId: string
  ): Promise<boolean> {
    // Check if user has admin permissions or if approval exists
    try {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        include: {
          collaborators: {
            where: {
              userId,
              canExecute: true,
            },
          },
        },
      });

      if (!agent) {
        return false;
      }

      // Creator has approval by default
      if (agent.createdBy === userId) {
        return true;
      }

      // Check if user is collaborator with execute permission
      return agent.collaborators.length > 0;
    } catch (error) {
      console.error('[PolicyEngine] Failed to check approval:', error);
      return false;
    }
  }
}

/**
 * Tool Access Controller - Validates tool access permissions
 */
export class ToolAccessController {
  /**
   * Check if agent can access a specific tool
   */
  async checkToolAccess(
    agentId: string,
    toolId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        include: {
          tools: true,
          workspace: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!agent) {
        return false;
      }

      // Check if tool is in agent's allowed tools
      const hasTool = agent.tools.some(t => t.id === toolId || t.name === toolId);
      if (!hasTool) {
        return false;
      }

      // Check workspace permissions
      if (agent.workspace) {
        const userPermissions = agent.workspace.members[0];
        if (!userPermissions) {
          return false;
        }

        // Check if user has permission to use tools in this workspace
        // This is a simplified check - extend based on your permission model
        return true;
      }

      // If no workspace, check if user is creator or collaborator
      if (agent.createdBy === userId) {
        return true;
      }

      const collaborator = await prisma.agentCollaborator.findFirst({
        where: {
          agentId,
          userId,
          canExecute: true,
        },
      });

      return collaborator !== null;
    } catch (error) {
      console.error('[ToolAccessController] Failed to check tool access:', error);
      return false;
    }
  }

  /**
   * Validate capabilities against allowed tools
   */
  async validateCapabilities(
    agentType: AgentType | string | undefined,
    capabilities: string[],
    availableTools: string[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!agentType) {
      return { valid: true, errors: [] };
    }

    const whitelist = new CapabilityWhitelist();
    const whitelistCheck = whitelist.validateCapabilities(agentType, capabilities);

    if (!whitelistCheck.valid) {
      errors.push(...whitelistCheck.errors);
    }

    // Check if required tools are available
    const safetyEvaluator = new SafetyEvaluator();
    const capabilityCheck = await safetyEvaluator.evaluateCapabilities(
      capabilities,
      availableTools
    );

    if (!capabilityCheck.valid) {
      errors.push(...capabilityCheck.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

