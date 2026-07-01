import { prisma } from '@/lib/prisma';
import {
  assertAgentAccess,
  assertProjectAccessForUser,
  assertTaskAccess,
  assertTeamAccessForUser,
} from '@/utils/http/resourceAccess';

export interface ExplicitContextOption {
  contexts?: Array<{ type: string; id: string }>;
  mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' | string }>;
  attachments?: Array<{ type: string; filename: string; content?: string }>;
}

export class ExplicitContextResolver {
  async resolve(userId: string, options?: ExplicitContextOption): Promise<string> {
    if (!options || (!options.contexts?.length && !options.mentions?.length)) {
      return '';
    }

    let resolvedText = '';

    if (options.mentions && options.mentions.length > 0) {
      resolvedText += `\n\n--- Mentioned Entities ---\n`;
      for (const mention of options.mentions) {
        try {
          if (mention.type === 'agent') {
            await assertAgentAccess(mention.id, userId, 'read');
            const agent = await prisma.aiAgent.findUnique({
              where: { id: mention.id },
              include: { tools: true },
            });
            if (agent) {
              resolvedText += `Agent Mentioned: ${agent.name}\n`;
              resolvedText += `Description: ${agent.description || 'N/A'}\n`;
              resolvedText += `Capabilities: ${(agent.capabilities as string[])?.join(', ') || 'N/A'}\n`;
              resolvedText += `Tools: ${agent.tools?.map((t: any) => t.name).join(', ') || 'None'}\n\n`;
            }
          } else if (mention.type === 'task') {
            await assertTaskAccess(mention.id, userId);
            const task = await prisma.task.findUnique({
              where: { id: mention.id },
            });
            if (task) {
              resolvedText += `Task Mentioned: ${task.title}\n`;
              resolvedText += `Description: ${task.description || 'N/A'}\n`;
              resolvedText += `Status: ${task.statusId || 'unknown'}\n\n`;
            }
          }
        } catch {
          // Skip entities the user cannot access
        }
      }
    }

    if (options.contexts && options.contexts.length > 0) {
      resolvedText += `\n\n--- Attached Contexts ---\n`;
      for (const ctx of options.contexts) {
        try {
          if (ctx.type === 'project') {
            await assertProjectAccessForUser(userId, ctx.id);
            const proj = await prisma.project.findUnique({ where: { id: ctx.id } });
            if (proj) {
              resolvedText += `Project Attached: ${proj.name}\n`;
              resolvedText += `Description: ${proj.description || 'N/A'}\n\n`;
            }
          } else if (ctx.type === 'task') {
            await assertTaskAccess(ctx.id, userId);
            const task = await prisma.task.findUnique({ where: { id: ctx.id } });
            if (task) {
              resolvedText += `Task Attached: ${task.title}\n`;
              resolvedText += `Description: ${task.description || 'N/A'}\n`;
              resolvedText += `Status: ${task.statusId || 'unknown'}\n\n`;
            }
          } else if (ctx.type === 'team') {
            await assertTeamAccessForUser(ctx.id, userId);
            const team = await prisma.team.findUnique({ where: { id: ctx.id } });
            if (team) {
              resolvedText += `Team Attached: ${team.name}\n`;
              resolvedText += `Description: ${team.description || 'N/A'}\n\n`;
            }
          }
        } catch {
          // Skip entities the user cannot access
        }
      }
    }

    if (options.attachments && options.attachments.length > 0) {
      resolvedText += `\n\n--- Attached Files ---\n`;
      for (const attachment of options.attachments) {
        if (attachment.content) {
          resolvedText += `File: ${attachment.filename}\n`;
          resolvedText += `Content:\n${attachment.content}\n\n`;
        }
      }
    }

    return resolvedText;
  }
}

export const explicitContextResolver = new ExplicitContextResolver();

/** @deprecated Use explicitContextResolver instead */
export const explicitContextService = explicitContextResolver;
