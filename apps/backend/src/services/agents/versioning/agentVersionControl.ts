/**
 * Agent Version Control
 * 
 * Manages versioning and conflict resolution for agent configurations:
 * - Version creation and tracking
 * - Rollback capabilities
 * - Conflict detection and resolution
 * - Optimistic locking
 */

import { prisma } from '@/lib/prisma';
import { AgentDraft } from '../state/agentBuilderStateService';

import { randomBytes } from 'crypto';

export interface Conflict {
  field: string;
  current: any;
  incoming: any;
  resolution?: 'CURRENT' | 'INCOMING' | 'MERGE';
}

export interface ConflictResolution {
  resolved: boolean;
  conflicts: Conflict[];
  merged?: AgentDraft;
}

export class AgentVersionControl {
  /**
   * Create a new version of agent configuration
   */
  async createVersion(
    agentId: string,
    draft: AgentDraft,
    userId: string
  ): Promise<string> {
    try {
      // Get current version number
      const currentVersion = await this.getCurrentVersion(agentId);
      const nextVersion = currentVersion + 1;
      const versionString = `v${nextVersion}`;

      // Create version record
      const version = await prisma.agentVersion.create({
        data: {
          id: randomBytes(16).toString('hex'),
          agentId,
          version: versionString,
          versionNumber: nextVersion,
          snapshot: draft as any,
          changedBy: userId,
          changeType: 'MINOR' as any, // Use MINOR for regular updates
          isActive: false,
          metadata: {
            createdAt: new Date().toISOString(),
          },
        },
      });

      return version.id;
    } catch (error) {
      console.error('[AgentVersionControl] Failed to create version:', error);
      throw new Error(`Failed to create version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current version number for agent
   */
  async getCurrentVersion(agentId: string): Promise<number> {
    const latestVersion = await prisma.agentVersion.findFirst({
      where: { agentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    return latestVersion?.versionNumber || 0;
  }

  /**
   * Get version by ID
   */
  async getVersion(versionId: string): Promise<any> {
    const version = await prisma.agentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    return version;
  }

  /**
   * Get all versions for an agent
   */
  async getVersions(agentId: string): Promise<any[]> {
    return await prisma.agentVersion.findMany({
      where: { agentId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /**
   * Rollback to a specific version
   */
  async rollback(agentId: string, versionId: string): Promise<void> {
    const version = await this.getVersion(versionId);

    if (version.agentId !== agentId) {
      throw new Error('Version does not belong to this agent');
    }

    await prisma.$transaction(async (tx) => {
      // Update agent with version snapshot
      const snapshot = version.snapshot as any;
      const updateData: any = {
        name: snapshot.name,
        description: snapshot.description,
        systemPrompt: snapshot.systemPrompt,
        capabilities: snapshot.capabilities,
        constraints: snapshot.constraints,
      };

      // Only update agentType if it's a valid enum value
      if (snapshot.agentType) {
        updateData.agentType = snapshot.agentType;
      }

      await tx.aiAgent.update({
        where: { id: agentId },
        data: updateData,
      });

      // Create a new version from the rollback
      const currentVersion = await this.getCurrentVersion(agentId);
      const nextVersion = currentVersion + 1;
      await tx.agentVersion.create({
        data: {
          id: randomBytes(16).toString('hex'),
          agentId,
          version: `v${nextVersion}`,
          versionNumber: nextVersion,
          snapshot: version.snapshot,
          changedBy: version.changedBy,
          changeType: 'ROLLBACK' as any,
          isActive: false,
          metadata: {
            rolledBackFrom: versionId,
            rolledBackAt: new Date().toISOString(),
          },
        },
      });
    });
  }

  /**
   * Compare two versions
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    const config1 = version1.snapshot as AgentDraft;
    const config2 = version2.snapshot as AgentDraft;

    const differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    // Compare all fields
    const allFields = new Set([
      ...Object.keys(config1 || {}),
      ...Object.keys(config2 || {}),
    ]);

    for (const field of allFields) {
      const value1 = config1?.[field as keyof AgentDraft];
      const value2 = config2?.[field as keyof AgentDraft];

      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field,
          oldValue: value1,
          newValue: value2,
        });
      }
    }

    return { differences };
  }
}

/**
 * Conflict Resolver - Resolves conflicts between concurrent updates
 */
export class ConflictResolver {
  /**
   * Detect conflicts between current and incoming drafts
   */
  detectConflicts(
    current: AgentDraft,
    incoming: Partial<AgentDraft>
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Fields that should be checked for conflicts
    const conflictFields: Array<keyof AgentDraft> = [
      'name',
      'description',
      'systemPrompt',
      'agentType',
      'capabilities',
      'constraints',
    ];

    for (const field of conflictFields) {
      const currentValue = current[field];
      const incomingValue = incoming[field];

      // Skip if incoming value is undefined or null
      if (incomingValue === undefined || incomingValue === null) {
        continue;
      }

      // Check for conflicts
      if (currentValue !== undefined && currentValue !== null) {
        // For arrays, check if they're different
        if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
          if (JSON.stringify(currentValue) !== JSON.stringify(incomingValue)) {
            conflicts.push({
              field,
              current: currentValue,
              incoming: incomingValue,
            });
          }
        } else if (currentValue !== incomingValue) {
          conflicts.push({
            field,
            current: currentValue,
            incoming: incomingValue,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflict(
    current: AgentDraft,
    incoming: Partial<AgentDraft>,
    strategy: 'MERGE' | 'OVERWRITE' | 'PROMPT_USER' = 'MERGE'
  ): Promise<ConflictResolution> {
    const conflicts = this.detectConflicts(current, incoming);

    if (conflicts.length === 0) {
      // No conflicts, simple merge
      return {
        resolved: true,
        conflicts: [],
        merged: { ...current, ...incoming } as AgentDraft,
      };
    }

    if (strategy === 'OVERWRITE') {
      // Overwrite current with incoming
      return {
        resolved: true,
        conflicts,
        merged: { ...current, ...incoming } as AgentDraft,
      };
    }

    if (strategy === 'PROMPT_USER') {
      // Return conflicts for user to resolve
      return {
        resolved: false,
        conflicts,
      };
    }

    // MERGE strategy with conflict detection
    const merged: AgentDraft = { ...current };
    const resolvedConflicts: Conflict[] = [];

    for (const conflict of conflicts) {
      const field = conflict.field as keyof AgentDraft;

      // Smart merge logic:
      // - If incoming has higher confidence or is more recent, use it
      // - Otherwise, preserve current
      if (this.shouldUseIncoming(conflict, current, incoming)) {
        merged[field] = conflict.incoming as any;
        resolvedConflicts.push({
          ...conflict,
          resolution: 'INCOMING',
        });
      } else {
        resolvedConflicts.push({
          ...conflict,
          resolution: 'CURRENT',
        });
      }
    }

    // Merge non-conflicting fields
    for (const key in incoming) {
      if (!conflicts.some(c => c.field === key)) {
        merged[key as keyof AgentDraft] = incoming[key as keyof AgentDraft] as any;
      }
    }

    return {
      resolved: true,
      conflicts: resolvedConflicts,
      merged,
    };
  }

  /**
   * Determine if incoming value should be used over current
   */
  private shouldUseIncoming(
    conflict: Conflict,
    current: AgentDraft,
    incoming: Partial<AgentDraft>
  ): boolean {
    const field = conflict.field;

    // For critical fields, prefer incoming if it's more complete
    if (field === 'systemPrompt' || field === 'name') {
      const incomingValue = conflict.incoming;
      const currentValue = conflict.current;

      // Prefer longer/more complete values
      if (typeof incomingValue === 'string' && typeof currentValue === 'string') {
        return incomingValue.length > currentValue.length;
      }

      // Prefer non-empty over empty
      if (incomingValue && !currentValue) {
        return true;
      }
    }

    // For arrays, prefer longer arrays (more capabilities/constraints)
    if (Array.isArray(conflict.incoming) && Array.isArray(conflict.current)) {
      return conflict.incoming.length > conflict.current.length;
    }

    // Default: prefer incoming
    return true;
  }
}

/**
 * Optimistic Lock Manager - Prevents concurrent modification conflicts
 */
export class OptimisticLockManager {
  /**
   * Update with optimistic locking
   */
  async updateWithLock(
    agentId: string,
    updateFn: (current: AgentDraft) => Promise<AgentDraft>,
    expectedVersion: number,
    maxAttempts: number = 3
  ): Promise<void> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const agent = await prisma.aiAgent.findUnique({
          where: { id: agentId },
        });

        if (!agent) {
          throw new Error('Agent not found');
        }

        // Get current version from metadata
        const metadata = (agent.metadata as any) || {};
        const currentVersion = metadata.version || 0;

        // Check version match
        if (currentVersion !== expectedVersion) {
          throw new ConflictError('Version mismatch', {
            expected: expectedVersion,
            actual: currentVersion,
          });
        }

        // Execute update function
        const updated = await updateFn(agent as any);

        // Update with incremented version
        // Build update data explicitly to avoid type issues
        const updateData: any = {
          metadata: {
            ...metadata,
            version: currentVersion + 1,
          },
        };

        // Only add valid Prisma fields
        if (updated.name) updateData.name = updated.name;
        if (updated.description !== undefined) updateData.description = updated.description;
        if (updated.systemPrompt) updateData.systemPrompt = updated.systemPrompt;
        if (updated.capabilities) updateData.capabilities = updated.capabilities;
        if (updated.constraints) updateData.constraints = updated.constraints;
        if (updated.avatar) updateData.avatar = updated.avatar;
        if (updated.personality) updateData.personality = updated.personality;
        // Skip agentType to avoid type issues - it should be set separately if needed

        await prisma.aiAgent.update({
          where: { id: agentId },
          data: updateData,
        });

        return; // Success
      } catch (error) {
        attempts++;

        if (error instanceof ConflictError) {
          if (attempts >= maxAttempts) {
            throw error;
          }
          // Exponential backoff
          await this.sleep(100 * Math.pow(2, attempts - 1));
          continue;
        }

        throw error;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

