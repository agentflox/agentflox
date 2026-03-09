/**
 * Permission Service
 * 
 * Handles agent permission checks for read, write, and execute operations.
 */

import { prisma } from '@/lib/prisma';

export type AgentRole = 'agent:owner' | 'agent:operator' | 'agent:viewer';

export class PermissionService {
  /**
   * Check if user has permission to perform an action on an agent
   */
  async checkAgentPermission(
    agentId: string,
    userId: string,
    permission: 'read' | 'write' | 'execute'
  ): Promise<boolean> {
    try {
      const { roles, collaborator } = await this.getAgentRoles(agentId, userId);

      // agent:owner has full access
      if (roles.has('agent:owner')) {
        return true;
      }

      switch (permission) {
        case 'read':
          // Any role that can see the agent is a viewer
          return roles.has('agent:viewer') || roles.has('agent:operator');
        case 'write':
          // Only operators (editors) may mutate configuration
          return roles.has('agent:operator');
        case 'execute':
          // Owners and operators may execute, plus any collaborator explicitly
          // granted canExecute=true for backwards compatibility.
          return (
            roles.has('agent:operator') ||
            (collaborator?.canExecute ?? false)
          );
        default:
          return false;
      }
    } catch (error) {
      console.error('[PermissionService] Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Resolve fine-grained agent roles for a user.
   * - agent:owner   → createdBy === userId
   * - agent:operator → collaborator with canEdit=true
   * - agent:viewer  → collaborator without edit rights
   */
  private async getAgentRoles(
    agentId: string,
    userId: string
  ): Promise<{ roles: Set<AgentRole>; collaborator: { canEdit: boolean; canExecute: boolean } | null }> {
    const roles = new Set<AgentRole>();

    const agent = await prisma.aiAgent.findUnique({
      where: { id: agentId },
      include: {
        collaborators: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!agent) {
      return { roles, collaborator: null };
    }

    // Creator is the canonical owner
    if (agent.createdBy === userId) {
      roles.add('agent:owner');
      roles.add('agent:operator');
      roles.add('agent:viewer');
      return { roles, collaborator: null };
    }

    const collaborator = agent.collaborators[0] ?? null;
    if (!collaborator) {
      return { roles, collaborator: null };
    }

    // Editor-level collaborator
    if (collaborator.canEdit) {
      roles.add('agent:operator');
      roles.add('agent:viewer');
    } else {
      // Read-only collaborator
      roles.add('agent:viewer');
    }

    return {
      roles,
      collaborator: {
        canEdit: !!collaborator.canEdit,
        canExecute: !!collaborator.canExecute,
      },
    };
  }

  /**
   * Check if user can read agent
   */
  async canRead(agentId: string, userId: string): Promise<boolean> {
    return this.checkAgentPermission(agentId, userId, 'read');
  }

  /**
   * Check if user can write/modify agent
   */
  async canWrite(agentId: string, userId: string): Promise<boolean> {
    return this.checkAgentPermission(agentId, userId, 'write');
  }

  /**
   * Check if user can execute agent
   */
  async canExecute(agentId: string, userId: string): Promise<boolean> {
    return this.checkAgentPermission(agentId, userId, 'execute');
  }
}

