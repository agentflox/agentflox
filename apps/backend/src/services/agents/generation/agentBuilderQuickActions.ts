/**
 * Agent Builder Quick Actions Generator
 * 
 * Generates contextual quick action buttons based on conversation stage
 */

import { ConversationStage, ConversationState } from '../state/agentBuilderStateService';
import { UserContext } from '../state/agentBuilderContextService';

export interface QuickAction {
  label: string;
  value: string;
  description?: string;
  avatar?: string;
  highlighted?: boolean;
  color?: string;
}

export class QuickActionGenerator {
  generateQuickActions(
    stage: ConversationStage,
    context: UserContext,
    state: ConversationState
  ): QuickAction[] {
    switch (stage) {
      case 'configuration':
        // Combined quick actions for all configuration aspects
        const configActions: QuickAction[] = [
          {
            label: 'Task Automation',
            value: 'I want to automate task workflows',
            description: 'Automate task creation, updates, and workflows',
          },
          {
            label: 'Customer Support',
            value: 'I need a customer support agent',
            description: 'Handle customer inquiries and support',
          },
          {
            label: 'Data Analysis',
            value: 'I want a data analysis agent',
            description: 'Analyze data and generate reports',
          },
        ];

        // Add project/team scope options if available
        if (context.projects && context.projects.length > 0) {
          configActions.push(...context.projects.slice(0, 3).map(p => ({
            label: `Project: ${p.name}`,
            value: `Work with project: ${p.name}`,
            description: `Scope: ${p.name} project`,
          })));
        }

        if (context.teams && context.teams.length > 0) {
          configActions.push(...context.teams.slice(0, 3).map(t => ({
            label: `Team: ${t.name}`,
            value: `Work with team: ${t.name}`,
            description: `Scope: ${t.name} team`,
          })));
        }

        return configActions;

      case 'testing':
        return [
          {
            label: 'Run Test',
            value: 'Run a test scenario',
            description: 'Test the agent with a sample scenario',
          },
          {
            label: 'Skip Testing',
            value: 'Skip testing and proceed to review',
            description: 'Move directly to review stage',
          },
        ];

      case 'review':
        return [
          {
            label: 'Launch Now',
            value: 'Launch the agent',
            description: 'Activate the agent immediately',
          },
          {
            label: 'Edit Configuration',
            value: 'I want to edit the configuration',
            description: 'Go back to configuration stage',
          },
        ];

      case 'launch':
        return [
          {
            label: 'View Agent',
            value: 'Show me the agent',
            description: 'View the launched agent',
          },
        ];

      default:
        return [];
    }
  }
}

export const quickActionGenerator = new QuickActionGenerator();

