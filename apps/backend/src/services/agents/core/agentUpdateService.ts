/**
 * Agent Update Service
 * 
 * Handles updating existing agents
 */

import { prisma } from '@/lib/prisma';

export interface AgentUpdateRequest {
  agentId: string;
  updates: Partial<{
    name: string;
    description: string;
    avatar: string;
    systemPrompt: string;
    personality: any;
    capabilities: string[];
    skills?: string[]; // IDs or names of assigned skills
    constraints: string[];
    modelConfig: {
      modelId: string;
      temperature: number;
      maxTokens: number;
    };
    tools: Array<{
      id: string;
      config: any;
      isActive: boolean;
    }>;
    triggers: Array<{
      type: string;
      config: any;
    }>;
    rules: Array<{
      type: string;
      condition: string;
      action: string;
    }>;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  }>;
  userId: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

export class AgentUpdateService {
  async updateAgent(request: AgentUpdateRequest) {
    // Verify access
    const agent = await prisma.aiAgent.findFirst({
      where: {
        id: request.agentId,
        OR: [
          { createdBy: request.userId },
          {
            collaborators: {
              some: { userId: request.userId, canExecute: true },
            },
          },
        ],
      },
    });

    if (!agent) {
      throw new Error('Agent not found or access denied');
    }

    // Validate updates
    const validation = await this.validateAgentUpdate(
      request.agentId,
      request.updates
    );
    if (!validation.valid && validation.errors.length > 0) {
      throw new Error(
        `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Create version snapshot before updating
    await this.createAgentVersion(request.agentId, request.userId);

    // Prepare update data
    const updateData: any = {};

    if (request.updates.name !== undefined) updateData.name = request.updates.name;
    if (request.updates.description !== undefined)
      updateData.description = request.updates.description;
    if (request.updates.avatar !== undefined) updateData.avatar = request.updates.avatar;
    if (request.updates.systemPrompt !== undefined)
      updateData.systemPrompt = request.updates.systemPrompt;
    if (request.updates.personality !== undefined)
      updateData.personality = request.updates.personality;
    if (request.updates.capabilities !== undefined)
      updateData.capabilities = request.updates.capabilities;
    if (request.updates.constraints !== undefined)
      updateData.constraints = request.updates.constraints;
    if (request.updates.status !== undefined)
      updateData.status = request.updates.status;

    if (request.updates.modelConfig) {
      if (request.updates.modelConfig.modelId !== undefined)
        updateData.modelId = request.updates.modelConfig.modelId;
      if (request.updates.modelConfig.temperature !== undefined)
        updateData.temperature = request.updates.modelConfig.temperature;
      if (request.updates.modelConfig.maxTokens !== undefined)
        updateData.maxTokens = request.updates.modelConfig.maxTokens;
    }

    if (request.updates.triggers) {
      updateData.triggerType = request.updates.triggers[0]?.type;
      updateData.triggerConfig = request.updates.triggers[0]?.config;
    }

    if (request.updates.rules || request.updates.tools) {
      const metadata: any = {};
      if (request.updates.rules) metadata.rules = request.updates.rules;
      if (request.updates.tools) metadata.tools = request.updates.tools;
      updateData.metadata = { ...(agent.metadata as any || {}), ...metadata };
    }

    updateData.lastModifiedBy = request.userId;

    // Apply updates
    const updated = await prisma.aiAgent.update({
      where: { id: request.agentId },
      data: updateData,
    });


    // Update skills if provided
    if (request.updates.skills !== undefined) {
      // 1. Resolve skill names/IDs to actual Skill IDs
      const skillIds: string[] = [];
      const skills = await prisma.agentSkill.findMany({
        where: {
          OR: [
            { id: { in: request.updates.skills } },
            { name: { in: request.updates.skills } }
          ]
        },
        select: { id: true }
      });
      skillIds.push(...skills.map(s => s.id));

      if (skillIds.length > 0) {
        // 2. Remove existing skills
        await prisma.agentToSkill.deleteMany({
          where: { agentId: request.agentId }
        });

        // 3. Add new skills
        await prisma.agentToSkill.createMany({
          data: skillIds.map(skillId => ({
            agentId: request.agentId,
            skillId,
            isEnabled: true
          }))
        });
      }
    }

    return updated;
  }

  async validateAgentUpdate(
    agentId: string,
    updates: Partial<AgentUpdateRequest['updates']>
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Validate required fields
    if (updates.name !== undefined && !updates.name.trim()) {
      errors.push({
        field: 'name',
        message: 'Agent name cannot be empty',
        severity: 'error',
      });
    }

    if (updates.systemPrompt !== undefined && !updates.systemPrompt.trim()) {
      errors.push({
        field: 'systemPrompt',
        message: 'System prompt cannot be empty',
        severity: 'error',
      });
    }

    // Validate model config
    if (updates.modelConfig?.modelId) {
      const model = await prisma.aiModel.findUnique({
        where: { id: updates.modelConfig.modelId },
      });
      if (!model) {
        errors.push({
          field: 'modelId',
          message: 'Invalid model selected',
          severity: 'error',
        });
      }
    }

    // Warnings
    if (updates.tools && updates.tools.length === 0) {
      warnings.push({
        field: 'tools',
        message: 'No tools configured. Agent may have limited capabilities.',
        suggestion: 'Consider adding tools to enable agent actions',
      });
    }

    if (updates.triggers && updates.triggers.length > 0) {
      const trigger = updates.triggers[0];
      if (trigger.type && !trigger.config) {
        warnings.push({
          field: 'triggerConfig',
          message: 'Trigger configuration is recommended when trigger type is set',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async createAgentVersion(agentId: string, userId: string) {
    const agent = await prisma.aiAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Create version snapshot
    const version = await prisma.agentVersion.create({
      data: {
        agentId,
        version: agent.version,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        personality: agent.personality,
        capabilities: agent.capabilities,
        constraints: agent.constraints,
        modelId: agent.modelId,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        metadata: agent.metadata,
        createdBy: userId,
      },
    });

    return version;
  }

  async getAgentVersions(agentId: string, userId: string) {
    // Verify access
    const agent = await prisma.aiAgent.findFirst({
      where: {
        id: agentId,
        OR: [
          { createdBy: userId },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
    });

    if (!agent) {
      throw new Error('Agent not found or access denied');
    }

    const versions = await prisma.agentVersion.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return versions;
  }

  async restoreVersion(
    agentId: string,
    versionId: string,
    userId: string
  ) {
    // Verify access
    const agent = await prisma.aiAgent.findFirst({
      where: {
        id: agentId,
        OR: [
          { createdBy: userId },
          {
            collaborators: {
              some: { userId, canExecute: true },
            },
          },
        ],
      },
    });

    if (!agent) {
      throw new Error('Agent not found or access denied');
    }

    const version = await prisma.agentVersion.findUnique({
      where: { id: versionId, agentId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Create new version of current state
    await this.createAgentVersion(agentId, userId);

    // Restore version
    const restored = await prisma.aiAgent.update({
      where: { id: agentId },
      data: {
        name: version.name,
        description: version.description,
        systemPrompt: version.systemPrompt,
        personality: version.personality,
        capabilities: version.capabilities,
        constraints: version.constraints,
        modelId: version.modelId,
        temperature: version.temperature,
        maxTokens: version.maxTokens,
        metadata: version.metadata,
        lastModifiedBy: userId,
      },
    });

    return restored;
  }
}

export const agentUpdateService = new AgentUpdateService();

