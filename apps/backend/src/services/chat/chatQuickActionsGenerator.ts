/**
 * Chat Quick Actions Generator
 * 
 * Generates contextual quick actions for user productivity
 * based on conversation state and context type
 */

import type { QuickAction, EnrichedContext } from './types';
import type { ChatContextType } from './utils/requestContext';

/**
 * Generate quick actions based on conversation state and context
 */
export async function generateQuickActions(
    contextType: ChatContextType,
    entityId: string,
    enrichedContext: EnrichedContext,
    latestUserMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
): Promise<QuickAction[]> {
    const actions: QuickAction[] = [];
    const messageLower = latestUserMessage.toLowerCase();

    // Project context actions
    if (contextType === 'project') {
        actions.push({
            id: 'view-project',
            label: 'View Project',
            action: 'navigate',
            icon: 'FolderOpen',
            variant: 'default',
        });

        if (enrichedContext.relevantTasks.length > 0) {
            actions.push({
                id: 'view-tasks',
                label: 'View All Tasks',
                action: 'navigate',
                icon: 'CheckSquare',
                variant: 'default',
            });
        }

        if (messageLower.includes('task') || messageLower.includes('todo')) {
            actions.push({
                id: 'create-task',
                label: 'Create Task',
                action: 'create',
                icon: 'Plus',
                variant: 'primary',
            });
        }

        if (messageLower.includes('schedule') || messageLower.includes('meeting')) {
            actions.push({
                id: 'schedule-meeting',
                label: 'Schedule Meeting',
                action: 'schedule',
                icon: 'Calendar',
                variant: 'default',
            });
        }

        if (messageLower.includes('team') || messageLower.includes('member')) {
            actions.push({
                id: 'view-team',
                label: 'View Team',
                action: 'navigate',
                icon: 'Users',
                variant: 'default',
            });
        }
    }

    // Team context actions
    if (contextType === 'team') {
        actions.push({
            id: 'view-team',
            label: 'View Team',
            action: 'navigate',
            icon: 'Users',
            variant: 'default',
        });

        actions.push({
            id: 'team-activity',
            label: 'Team Activity',
            action: 'navigate',
            icon: 'Activity',
            variant: 'default',
        });

        if (messageLower.includes('member') || messageLower.includes('invite')) {
            actions.push({
                id: 'invite-member',
                label: 'Invite Member',
                action: 'invite',
                icon: 'UserPlus',
                variant: 'primary',
            });
        }

        if (messageLower.includes('project')) {
            actions.push({
                id: 'view-projects',
                label: 'View Projects',
                action: 'navigate',
                icon: 'FolderOpen',
                variant: 'default',
            });
        }
    }

    // Workspace context actions
    if (contextType === 'workspace') {
        actions.push({
            id: 'view-workspace',
            label: 'View Workspace',
            action: 'navigate',
            icon: 'Briefcase',
            variant: 'default',
        });

        if (messageLower.includes('project')) {
            actions.push({
                id: 'create-project',
                label: 'Create Project',
                action: 'create',
                icon: 'Plus',
                variant: 'primary',
            });
        }

        if (messageLower.includes('team')) {
            actions.push({
                id: 'create-team',
                label: 'Create Team',
                action: 'create',
                icon: 'Users',
                variant: 'primary',
            });
        }

        if (enrichedContext.relevantProjects.length > 0) {
            actions.push({
                id: 'view-projects',
                label: 'All Projects',
                action: 'navigate',
                icon: 'FolderOpen',
                variant: 'default',
            });
        }
    }

    // Proposal context actions
    if (contextType === 'proposal') {
        actions.push({
            id: 'view-proposal',
            label: 'View Proposal',
            action: 'navigate',
            icon: 'FileText',
            variant: 'default',
        });

        if (messageLower.includes('edit') || messageLower.includes('update')) {
            actions.push({
                id: 'edit-proposal',
                label: 'Edit Proposal',
                action: 'edit',
                icon: 'Edit',
                variant: 'primary',
            });
        }
    }

    // Common actions based on conversation content
    if (conversationHistory.length > 5) {
        actions.push({
            id: 'export-chat',
            label: 'Export Chat',
            action: 'export',
            icon: 'Download',
            variant: 'default',
        });
    }

    // Limit to top 5 most relevant actions
    return actions.slice(0, 5);
}
