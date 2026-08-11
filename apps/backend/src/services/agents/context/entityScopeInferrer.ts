/**
 * Entity Scope Inferrer
 * 
 * Infers which workspace entity (workspace, space, project, team) the user is referring to
 * and fetches detailed context when needed.
 */

import { completeWithDefaultModel } from '@/services/models';
import { UserContext, agentBuilderContextService } from '../state/agentBuilderContextService';
import {
  checkAgentTokenLimit,
  estimateTokens,
} from '@/utils/ai/agentUsageTracking';
import { InferredEntityScopeSchema } from '../types/schemas';
import { extractJson } from '@/utils/ai/jsonParsing';

export class EntityScopeInferrer {
  /**
   * Infer entity scope and fetch detailed context
   */
  async inferAndFetchEntityScope(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userContext: UserContext,
    userId: string
  ): Promise<UserContext> {
    const scopeInferenceMessages = [
      {
        role: 'system' as const,
        content: `You are an entity scope inference AI. Analyze the conversation to determine which workspace entity (workspace, space, project, or team) the user is referring to.
  
  AVAILABLE ENTITIES:
  - Workspaces: ${userContext.workspaces.map(w => `${w.name} (${w.id})`).join(', ')}
  - Spaces: ${userContext.spaces.map(s => `${s.name} (${s.id})`).join(', ')}
  - Projects: ${userContext.projects.map(p => `${p.name} (${p.id})`).join(', ')}
  - Teams: ${userContext.teams.map(t => `${t.name} (${t.id})`).join(', ')}
  
  Determine:
  1. Which type of entity is being referenced (workspace, space, project, team, portable, or none)
  2. Which specific entity by ID (if applicable)
  3. Whether we should fetch detailed context for this entity
  4. Confidence level (0-100)
  
  "portable" means the user wants to build a template/marketplace agent that isn't bound to any specific entity.`,
      },
      {
        role: 'user' as const,
        content: `Recent conversation:
  ${conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}
  
  Latest message: "${message}"
  
  What entity scope should we use?`,
      },
    ];

    const estimatedTokens = estimateTokens(JSON.stringify(scopeInferenceMessages)) + 200;

    const tokenCheck = await checkAgentTokenLimit(userId, estimatedTokens);
    if (!tokenCheck.allowed) {
      console.warn('Insufficient tokens for scope inference, using base context');
      return userContext;
    }

    try {
      const { completion } = await completeWithDefaultModel({
        userId: userId || 'system',
        request: {
          messages: scopeInferenceMessages,
          temperature: 0.3,
          max_tokens: 200,
          tools: [
            {
              type: 'function',
              function: {
                name: 'infer_entity_scope',
                description: 'Infer which entity the user is referring to',
                parameters: {
                  type: 'object',
                  properties: {
                    scopeType: {
                      type: 'string',
                      enum: ['workspace', 'space', 'project', 'team', 'portable', 'none'],
                    },
                    entityId: { type: 'string' },
                    entityName: { type: 'string' },
                    confidence: { type: 'number', minimum: 0, maximum: 100 },
                    reasoning: { type: 'string' },
                    shouldFetchDetails: { type: 'boolean' },
                  },
                  required: ['scopeType', 'confidence', 'reasoning', 'shouldFetchDetails'],
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'infer_entity_scope' } },
          stream: false,
        },
        usageContext: { action: 'ANALYZE', metadata: { source: 'entityScopeInferrer' } },
        skipEntitlement: true,
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'infer_entity_scope') {
        const parsed = extractJson(toolCall.function.arguments);
        const validated = InferredEntityScopeSchema.parse(parsed);

        console.log('[EntityScopeInferrer] Inferred entity scope:', validated);

        // Fetch detailed context if needed and confidence is high
        if (validated.shouldFetchDetails && validated.confidence >= 70 && validated.entityId) {
          const enrichedContext = { ...userContext };

          try {
            switch (validated.scopeType) {
              case 'workspace':
                const workspaceDetails = await agentBuilderContextService.fetchWorkspaceDetails(
                  validated.entityId,
                  userId
                );
                enrichedContext.workspace = workspaceDetails.workspace;
                enrichedContext.teamMembers = workspaceDetails.teamMembers;
                enrichedContext.recentActivity = workspaceDetails.recentActivity;
                console.log(`[EntityScopeInferrer] Enriched context with workspace details: ${validated.entityName}`);
                break;

              case 'space':
                const spaceDetails = await agentBuilderContextService.fetchSpaceDetails(
                  validated.entityId
                );
                enrichedContext.spaceDetails = spaceDetails;
                console.log(`[EntityScopeInferrer] Enriched context with space details: ${validated.entityName}`);
                break;

              case 'project':
                const projectDetails = await agentBuilderContextService.fetchProjectDetails(
                  validated.entityId
                );
                enrichedContext.projectDetails = projectDetails;
                console.log(`[EntityScopeInferrer] Enriched context with project details: ${validated.entityName}`);
                break;

              case 'team':
                const teamDetails = await agentBuilderContextService.fetchTeamDetails(
                  validated.entityId
                );
                enrichedContext.teamDetails = teamDetails;
                console.log(`[EntityScopeInferrer] Enriched context with team details: ${validated.entityName}`);
                break;
            }

            return enrichedContext;
          } catch (error) {
            console.error(`[EntityScopeInferrer] Failed to fetch detailed context for ${validated.scopeType}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to infer entity scope:', error);
    }

    return userContext;
  }
}
