/**
 * Agent Builder Entity Service
 * 
 * Extracts entities from user messages and enriches context
 */

import { UserContext } from '../state/agentBuilderContextService';
import { ConversationState } from '../state/agentBuilderStateService';
import { getAllTools } from '../registry/toolRegistry';

export interface ExtractedEntities {
  lists: string[];
  spaces: string[];
  teamMembers: string[];
  triggers: string[];
  keywords: string[];
  actions: string[];
}

export class AgentBuilderEntityService {
  async extractEntities(
    message: string,
    userContext: UserContext
  ): Promise<ExtractedEntities> {
    const entities: ExtractedEntities = {
      lists: [],
      spaces: [],
      teamMembers: [],
      triggers: [],
      keywords: [],
      actions: [],
    };

    const messageLower = message.toLowerCase();

    // Match list names
    if (userContext.workspace && userContext.workspace.spaces) {
      const workspace = userContext.workspace;
      for (const space of workspace.spaces) {
        for (const list of space.allLists || []) {
          if (messageLower.includes(list.name.toLowerCase())) {
            entities.lists.push(list.id);
          }
        }

        // Match space names
        if (messageLower.includes(space.name.toLowerCase())) {
          entities.spaces.push(space.id);
        }
      }
    }

    // Match team member names
    if (userContext.teamMembers && Array.isArray(userContext.teamMembers)) {
      const teamMembers = userContext.teamMembers;
      for (const member of teamMembers) {
        const nameLower = member.name.toLowerCase();
        const emailPrefix = member.email.split('@')[0].toLowerCase();
        if (
          messageLower.includes(nameLower) ||
          messageLower.includes(emailPrefix)
        ) {
          entities.teamMembers.push(member.id);
        }
      }
    }

    // Match trigger keywords
    const triggerKeywords: Record<string, string> = {
      created: 'task-created',
      'new task': 'task-created',
      updated: 'task-updated',
      'status change': 'status-changed',
      comment: 'comment-added',
      schedule: 'scheduled',
      'every day': 'scheduled',
      'on a schedule': 'scheduled',
      'daily': 'scheduled',
      'weekly': 'scheduled',
      'monthly': 'scheduled',
      'hourly': 'scheduled',
      'cron': 'scheduled',
    };

    for (const [keyword, triggerId] of Object.entries(triggerKeywords)) {
      if (messageLower.includes(keyword)) {
        entities.triggers.push(triggerId);
      }
    }

    // Extract schedule information (cron expressions, time patterns)
    const cronPattern = /(?:cron|schedule|every)\s*(?:expression|pattern)?[:\s]+([0-9\s\*\-\/\,]+)/i;
    const cronMatch = message.match(cronPattern);
    if (cronMatch) {
      entities.triggers.push('scheduled');
      entities.keywords.push('cron:' + cronMatch[1]);
    }

    // Extract time patterns
    const timePatterns = [
      { pattern: /every\s+(\d+)\s*(?:hour|hours|hr|hrs)/i, type: 'hourly' },
      { pattern: /every\s+(\d+)\s*(?:day|days)/i, type: 'daily' },
      { pattern: /every\s+(\d+)\s*(?:week|weeks)/i, type: 'weekly' },
      { pattern: /every\s+(\d+)\s*(?:month|months)/i, type: 'monthly' },
      { pattern: /at\s+(\d{1,2}):(\d{2})\s*(?:am|pm)?/i, type: 'daily' },
    ];

    for (const { pattern, type } of timePatterns) {
      if (pattern.test(message)) {
        entities.triggers.push('scheduled');
        entities.keywords.push('schedule-type:' + type);
      }
    }

    // Extract action keywords
    const actionKeywords = [
      'assign',
      'create',
      'update',
      'set',
      'change',
      'add',
      'remove',
      'notify',
      'send',
    ];
    const extractedKeywords = actionKeywords.filter((kw) =>
      messageLower.includes(kw)
    );
    entities.keywords = extractedKeywords;

    // Extract actions
    const actionPatterns = [
      { pattern: /assign/i, action: 'assign' },
      { pattern: /create/i, action: 'create' },
      { pattern: /update/i, action: 'update' },
      { pattern: /set/i, action: 'set' },
      { pattern: /change/i, action: 'change' },
      { pattern: /notify/i, action: 'notify' },
      { pattern: /send/i, action: 'send' },
    ];

    entities.actions = actionPatterns
      .filter(({ pattern }) => pattern.test(message))
      .map(({ action }) => action);

    return entities;
  }

  async enrichMessageWithContext(
    message: string,
    conversationState: ConversationState,
    userContext: UserContext
  ): Promise<ConversationState> {
    // Extract entities from user message
    const entities = await this.extractEntities(message, userContext);

    // Fetch additional context based on entities mentioned
    if (entities.lists.length > 0 && userContext.workspace) {
      // User mentioned a list, fetch its details
      const workspace = userContext.workspace;
      const listId = entities.lists[0];
      const listDetails = await this.fetchListDetails(
        listId,
        workspace.id
      );
      conversationState.focusedList = listDetails;
    }

    if (entities.teamMembers.length > 0 && userContext.workspace) {
      // User mentioned team members
      const workspace = userContext.workspace;
      const memberDetails = await this.fetchMemberDetails(
        entities.teamMembers,
        workspace.id
      );
      conversationState.mentionedUsers = memberDetails;
    }

    // Add relevant suggestions based on context
    conversationState.suggestions = await this.generateSuggestions(
      message,
      conversationState,
      userContext
    );

    return conversationState;
  }

  private async fetchListDetails(listId: string, workspaceId: string) {
    // TODO: Implement list details fetching
    return { id: listId };
  }

  private async fetchMemberDetails(
    memberIds: string[],
    workspaceId: string
  ) {
    // TODO: Implement member details fetching
    return memberIds.map((id) => ({ id }));
  }

  private async generateSuggestions(
    message: string,
    state: ConversationState,
    context: UserContext
  ): Promise<
    Array<{
      type: string;
      value: any;
      label: string;
      reason: string;
    }>
  > {
    const suggestions: Array<{
      type: string;
      value: any;
      label: string;
      reason: string;
    }> = [];

    // Suggest based on conversation stage
    const stageStr = String(state.stage);
    const hasTriggerStage = stageStr.includes('trigger') || stageStr.includes('Trigger');
    if (hasTriggerStage) {
      // Suggest most relevant triggers
      if (message.includes('task') && message.includes('create')) {
        suggestions.push({
          type: 'trigger',
          value: 'task-created',
          label: 'Task Created trigger',
          reason: 'You mentioned creating tasks',
        });
      }
    }

    const hasLocationStage = stageStr.includes('location') || stageStr.includes('Location');
    if (hasLocationStage && state.focusedList) {
      // Suggest the list they mentioned
      suggestions.push({
        type: 'location',
        value: state.focusedList.id,
        label: state.focusedList.name,
        reason: 'You mentioned this list',
      });
    }

    const hasActionStage = stageStr.includes('action') || stageStr.includes('Action');
    if (hasActionStage) {
      // Suggest based on detected patterns
      const recentActivity = context.recentActivity;
      if (recentActivity?.commonTaskPatterns) {
        for (const pattern of recentActivity.commonTaskPatterns) {
          if (pattern.type === 'title_to_priority') {
            suggestions.push({
              type: 'rule',
              value: {
                condition: "title contains 'urgent'",
                action: 'set priority to high',
              },
              label: 'Auto-prioritize urgent tasks',
              reason: 'Common pattern in your workspace',
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Get default tools for new agents
   */
  async getDefaultTools(): Promise<string[]> {
    const { getAllTools } = await import('../registry/toolRegistry');
    const defaultTools = await getAllTools();
    return defaultTools.map((tool) => tool.name); // Use name instead of id
  }

  /**
   * Extract schedule configuration from message
   */
  extractScheduleConfig(message: string): {
    isScheduled: boolean;
    cronExpression?: string;
    timezone?: string;
  } {
    const messageLower = message.toLowerCase();
    const result: {
      isScheduled: boolean;
      cronExpression?: string;
      timezone?: string;
    } = {
      isScheduled: false,
    };

    // Check for schedule keywords
    const scheduleKeywords = ['schedule', 'scheduled', 'cron', 'every day', 'daily', 'weekly', 'monthly', 'hourly'];
    const hasScheduleKeyword = scheduleKeywords.some(keyword => messageLower.includes(keyword));

    if (!hasScheduleKeyword) {
      return result;
    }

    result.isScheduled = true;

    // Extract cron expression
    const cronPattern = /(?:cron|schedule)[:\s]+([0-9\s\*\-\/\,]+)/i;
    const cronMatch = message.match(cronPattern);
    if (cronMatch) {
      result.cronExpression = cronMatch[1].trim();
    } else {
      // Try to infer cron from natural language
      if (messageLower.includes('every day') || messageLower.includes('daily')) {
        result.cronExpression = '0 0 * * *'; // Daily at midnight
      } else if (messageLower.includes('every week') || messageLower.includes('weekly')) {
        result.cronExpression = '0 0 * * 0'; // Weekly on Sunday
      } else if (messageLower.includes('every month') || messageLower.includes('monthly')) {
        result.cronExpression = '0 0 1 * *'; // Monthly on 1st
      } else if (messageLower.includes('every hour') || messageLower.includes('hourly')) {
        result.cronExpression = '0 * * * *'; // Every hour
      }
    }

    // Extract timezone
    const timezonePattern = /(?:timezone|tz)[:\s]+([A-Za-z_\/]+)/i;
    const timezoneMatch = message.match(timezonePattern);
    if (timezoneMatch) {
      result.timezone = timezoneMatch[1].trim();
    } else {
      result.timezone = 'UTC'; // Default
    }

    return result;
  }

  /**
   * Get default triggers for non-scheduled agents
   */
  getDefaultTriggers(): string[] {
    return ['ASSIGN_TASK', 'DIRECT_MESSAGE', 'MENTION'];
  }
}

export const agentBuilderEntityService = new AgentBuilderEntityService();

