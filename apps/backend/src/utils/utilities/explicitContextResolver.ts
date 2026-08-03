import { prisma } from '@/lib/prisma';
import {
  assertAgentAccess,
  assertProjectAccessForUser,
  assertTaskAccess,
  assertTeamAccessForUser,
} from '@/utils/http/resourceAccess';

export interface ExplicitContextOption {
  contexts?: Array<{ type: string; id: string }>;
  mentions?: Array<{ id: string; name: string; type: 'agent' | 'task' | 'user' | 'doc' | string }>;
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
            // AI Agent mention
            await assertAgentAccess(mention.id, userId, 'read');
            const agent = await prisma.aiAgent.findUnique({
              where: { id: mention.id },
              include: { tools: true },
            });
            if (agent) {
              resolvedText += `AI Agent Mentioned: ${agent.name}\n`;
              resolvedText += `Description: ${agent.description || 'N/A'}\n`;
              resolvedText += `Capabilities: ${(agent.capabilities as string[])?.join(', ') || 'N/A'}\n`;
              resolvedText += `Tools: ${agent.tools?.map((t: any) => t.name).join(', ') || 'None'}\n\n`;
            }
          } else if (mention.type === 'user') {
            // Workspace member / user mention
            const user = await (prisma as any).user.findUnique({
              where: { id: mention.id },
              select: {
                id: true,
                name: true,
                email: true,
              },
            });
            if (user) {
              resolvedText += `User Mentioned: ${user.name || user.email}\n`;
              resolvedText += `Email: ${user.email}\n\n`;
            }
          } else if (mention.type === 'task') {
            // Task mention — fetch with actual status name and assignees
            await assertTaskAccess(mention.id, userId);
            const task = await (prisma as any).task.findUnique({
              where: { id: mention.id },
              include: {
                status: { select: { name: true, color: true } },
                assignees: {
                  select: {
                    user: { select: { name: true, email: true } },
                  },
                },
              },
            });
            if (task) {
              resolvedText += `Task Mentioned: ${task.title}\n`;
              resolvedText += `Description: ${task.description || 'N/A'}\n`;
              resolvedText += `Status: ${task.status?.name || 'Unknown'}\n`;
              resolvedText += `Priority: ${task.priority || 'Normal'}\n`;
              if (task.dueDate) {
                resolvedText += `Due: ${new Date(task.dueDate).toLocaleDateString()}\n`;
              }
              const assigneeNames = task.assignees
                ?.map((a: any) => a.user?.name || a.user?.email)
                .filter(Boolean)
                .join(', ');
              if (assigneeNames) {
                resolvedText += `Assignees: ${assigneeNames}\n`;
              }
              resolvedText += '\n';
            }
          } else if (mention.type === 'doc') {
            // Document mention — include a content preview
            const doc = await (prisma as any).document.findUnique({
              where: { id: mention.id },
              select: {
                id: true,
                title: true,
                content: true,
                updatedAt: true,
              },
            });
            if (doc) {
              resolvedText += `Document Mentioned: ${doc.title}\n`;
              const rawContent = typeof doc.content === 'string'
                ? doc.content
                : JSON.stringify(doc.content);
              const preview = rawContent?.slice(0, 500) || 'No content';
              resolvedText += `Content Preview:\n${preview}${rawContent?.length > 500 ? '...' : ''}\n`;
              resolvedText += `Last Updated: ${new Date(doc.updatedAt).toLocaleDateString()}\n\n`;
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
            const task = await (prisma as any).task.findUnique({
              where: { id: ctx.id },
              include: {
                status: { select: { name: true } },
              },
            });
            if (task) {
              resolvedText += `Task Attached: ${task.title}\n`;
              resolvedText += `Description: ${task.description || 'N/A'}\n`;
              resolvedText += `Status: ${task.status?.name || 'Unknown'}\n\n`;
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
