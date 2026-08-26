/**
 * Agent Update Service
 * 
 * Handles updating existing agents
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@agentflox/database';
import { randomBytes } from 'crypto';

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
          { ownerId: request.userId },
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
      const skills = await prisma.aiSkill.findMany({
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
        await prisma.aiAgentToSkill.deleteMany({
          where: { agentId: request.agentId }
        });

        // 3. Add new skills
        await prisma.aiAgentToSkill.createMany({
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
    const latestVersion = await prisma.agentVersion.findFirst({
      where: { agentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const snapshot = {
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
    };

    const version = await prisma.agentVersion.create({
      data: {
        id: randomBytes(16).toString('hex'),
        agentId,
        version: agent.version,
        versionNumber: nextVersionNumber,
        snapshot,
        changedBy: userId,
        changeType: 'MINOR',
        isActive: false,
        metadata: agent.metadata === null ? Prisma.JsonNull : (agent.metadata as Prisma.InputJsonValue),
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
          { ownerId: userId },
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
          { ownerId: userId },
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
    const snapshot = (version.snapshot ?? {}) as Record<string, unknown>;

    const restored = await prisma.aiAgent.update({
      where: { id: agentId },
      data: {
        name: typeof snapshot.name === 'string' ? snapshot.name : agent.name,
        description: typeof snapshot.description === 'string' ? snapshot.description : agent.description,
        systemPrompt: typeof snapshot.systemPrompt === 'string' ? snapshot.systemPrompt : agent.systemPrompt,
        personality: snapshot.personality === null ? Prisma.JsonNull : (snapshot.personality as Prisma.InputJsonValue | undefined),
        capabilities: Array.isArray(snapshot.capabilities) ? snapshot.capabilities as string[] : agent.capabilities,
        constraints: Array.isArray(snapshot.constraints) ? snapshot.constraints as string[] : agent.constraints,
        modelId: typeof snapshot.modelId === 'string' ? snapshot.modelId : agent.modelId,
        temperature: typeof snapshot.temperature === 'number' ? snapshot.temperature : agent.temperature,
        maxTokens: typeof snapshot.maxTokens === 'number' ? snapshot.maxTokens : agent.maxTokens,
        metadata: (() => {
          const value = snapshot.metadata !== undefined ? snapshot.metadata : agent.metadata;
          return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
        })(),
        lastModifiedBy: userId,
      },
    });

    return restored;
  }
}

export const agentUpdateService = new AgentUpdateService();

