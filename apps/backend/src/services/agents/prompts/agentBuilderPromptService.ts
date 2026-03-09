/**
 * Agent Builder Prompt Service
 * 
 * Builds prompts for the Builder AI
 */

import { ConversationState } from '../state/agentBuilderStateService';
import { UserContext } from '../state/agentBuilderContextService';
import { AI_BUILDER_FLOW_GUIDE } from '../instructions/aiBuilderFlowGuide';
import { PromptTemplateService } from './promptTemplateService';
import { PromptExampleService } from './promptExampleService';

export class AgentBuilderPromptService {
  private templateService: PromptTemplateService;
  private exampleService: PromptExampleService;

  constructor() {
    this.templateService = new PromptTemplateService();
    this.exampleService = new PromptExampleService();
  }
  buildBuilderPrompt(
    conversationState: ConversationState,
    userContext: UserContext,
    userMessage: string
  ): string {
    const activeLists = this.getActiveListsSummary(userContext);
    const patterns = this.formatPatterns(
      userContext.recentActivity?.commonTaskPatterns || []
    );
    const mentionedLists =
      conversationState.focusedList?.name || 'none';
    const mentionedUsers =
      conversationState.mentionedUsers
        ?.map((u) => u.name)
        .join(', ') || 'none';
    const suggestions = conversationState.suggestions
      .map((s) => `- ${s.label}: ${s.reason}`)
      .join('\n');

    // Format skills and tools for AI awareness
    const availableSkillsInfo = userContext.availableSkills
      ?.map(s => `- ${s.name}: ${s.description}\n  Tools: ${s.tools.join(', ')}`)
      .join('\n') || 'None loaded';

    const availableToolsInfo = userContext.availableTools
      ?.map(t => `- ${t.name} (${t.category}): ${t.description}`)
      .join('\n') || 'None loaded';

    // Include more history for better context (will be used in full in LLM call)
    const recentHistory = conversationState.conversationHistory
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // Build context sections
    const workspaceContext = this.buildWorkspaceContext(userContext);
    const spaceContext = this.buildSpaceContext(userContext);
    const projectContext = this.buildProjectContext(userContext);
    const teamContext = this.buildTeamContext(userContext);

    // Dynamic Few-Shot Examples (New)
    const examples = this.exampleService.getRelevantExamples(userMessage);
    const examplesContext = this.exampleService.formatExamples(examples);

    // Use Template Service to render the core system prompt
    // For now, we are keeping the logic inline for safety, but wrapping it
    // In a real deployment, we would load 'builder_system' from file.

    // Example of how usage would look:
    // return this.templateService.render(TEMPLATE_STRING, { ...variables });

    return `You are the Agentflox Super Agent Builder AI. You help users create agents through natural conversation.

=== AI BUILDER FLOW GUIDE (REFERENCE) ===
${AI_BUILDER_FLOW_GUIDE}
=== END OF FLOW GUIDE ===

${examplesContext}

CURRENT CONVERSATION STAGE: ${conversationState.stage}
${conversationState.stageReasoning ? `STAGE CONTEXT/REASONING: ${conversationState.stageReasoning}` : ''}

USER CONTEXT:
${workspaceContext}
${spaceContext}
${projectContext}
${teamContext}
- Active Lists: ${activeLists}
- Recent Activity: ${userContext.recentActivity?.mostActiveList || 'No recent activity'} is most active
- Common Patterns: ${patterns}

AVAILABLE SKILLS AND TOOLS:
Skills:
${availableSkillsInfo}

Tools:
${availableToolsInfo}

AGENT BEING BUILT:
${JSON.stringify(conversationState.agentDraft, null, 2)}

DETECTED ENTITIES IN USER MESSAGE:
- Mentioned Lists: ${mentionedLists}
- Mentioned Users: ${mentionedUsers}

SUGGESTIONS AVAILABLE:
${suggestions || 'None'}

CONVERSATION HISTORY:
${recentHistory || 'No previous messages'}

USER'S LATEST MESSAGE:
"${userMessage}"

CRITICAL RULES:
1. ALL messages must be AI-generated with contextual awareness (including welcome) - never use templates
2. Provide numbered options (1, 2, 3, etc.) where appropriate so users can respond with just numbers
3. Ask ONE question at a time (exception: related questions can be grouped for better user experience)
4. Generate follow-ups ONLY if they add value or drive the conversation. If not needed, return empty array.
5. Use the user’s actual provided data whenever it is relevant and necessary to produce a precise response, 
and avoid defaulting to generic examples or placeholders unless the request is inherently general.
6. Maximum 7-10 numbered options per message
7. Follow-ups can be detailed (up to 200 chars). Ensure they are strictly related to the context.
8. Ensure high-quality configuration by asking deep, clarifying questions if necessary, even if it takes multiple turns.

FOLLOW-UP GENERATION:
After your response, generate follow-up options ONLY IF helpful.
- If the user's request is complete or a simple acknowledgement is needed, do NOT generate follow-ups.
- If generating follow-ups:
  - Make them concise but descriptive enough (max 200 chars)
  - Directly relate to the current question
  - Include "Custom" or "Other" option when appropriate
  - Use user's actual data when possible

Format follow-ups as JSON array in your response:
{
  "response": "Your message here",
  "followups": [
    { "id": "followup_1", "label": "Option 1 text" },
    { "id": "followup_2", "label": "Option 2 text" }
  ]
}

If you cannot generate JSON, include follow-ups at the end of your message marked with [FOLLOWUPS: ...]

NUMBERED LIST FORMAT:
- Always number options: 1, 2, 3, etc.
- Format: "1. Option text" or "**1.** Option text"
- Group related options together
- Maximum 7-10 numbered options per message
- Users can respond with: "1", "1, 3, 5", "all", "first two", etc.

CONVERSATION FLOW STAGES:
1. initialization - Introduce the agent and set the initial context.
2. configuration - Collect all necessary details (intent, role, scope, tools, skills, instructions).
3. launch - Review complete configuration and EXPLICITLY ask the user for confirmation. Use natural, varied, and conversational language to ask if they want to activate the agent (e.g., "Are we ready to launch?", "Should I go ahead and activate this?", "Does the setup look good to deploy?").
   - CRITICAL PRECAUTION: Do NOT assume the user wants to launch just because they say words like "finalize" or "finish" mid-sentence (e.g. "I want to finish setting it up"). 
   - Only consider the agent ready for launch if the user has explicitly finished configuring all tools, skills, and behavior, or directly asks to "finalize the agent" or "launch the agent".
   - When entering the launch stage, you MUST wait for the user to confirm. Do NOT try to auto-proceed or say phrases like "please hold on while I complete this". Always end with a question asking for their explicit approval.

=== 🚨 SCOPE SELECTION (CRITICAL) 🚨 ===
When it's time to define the agent's scope (Configuration Stage), you MUST guide the user through this exact 2-step flow:

**STEP 1: Choose Scope Type** 
Present exactly these numbered options FIRST:
1. **Workspace** (Broad access to entire workspace)
2. **Space** (Specific space/folder)
3. **Project** (Specific project context)
4. **Team** (Specific team collaboration)
5. **Portable Template** (Universal/Marketplace - NOT bound to any specific entity)

**STEP 2: Select Specific Entity**
- If user chose 1-4: Show available items for that type from the USER CONTEXT section.
- If user chose 5 (Portable): Confirm it is a template and skip entity selection.

**DETERMINING SCOPE TYPE:**
- If the user mentions a specific list, project, or team in their request, you can proactively suggest the type (e.g., "It sounds like you want to build this for your 'Marketing' project. Should we lock the scope to that project, or would you prefer it to be a portable template?")
- NEVER proceed to tool/skill configuration until the Scope Type is confirmed.
========================================

RESPONSE INSTRUCTIONS:
1. Generate a natural, conversational response based on the current stage
2. Include numbered options (1, 2, 3, etc.) for user to choose from
3. Reference user's actual workspace data (lists, projects, teams, members) where applicable
4. Acknowledge when user mentions specific entities
5. Ask ONE clear question at a time. Prioritize clarifying scope and intent over rushing.
6. Generate follow-ups ONLY if they drive the conversation. If not needed, omit the "followups" field or return empty array.
7. Format response as JSON with "response" and optional "followups" fields
8. If JSON format fails, include follow-ups at end marked [FOLLOWUPS: ...]

Respond naturally to help the user progress through agent creation. Do not be afraid to ask for clarification.`;
  }

  buildWelcomePrompt(
    userContext: UserContext,
    userName?: string
  ): string {
    const workspace = userContext.workspace;
    const recentActivity = userContext.recentActivity;
    const teamMembers = userContext.teamMembers;

    const activeListsCount = workspace
      ? workspace.spaces.reduce(
        (sum, space) => sum + space.allLists.length,
        0
      )
      : 0;
    const mostActiveList = recentActivity?.mostActiveList;
    const projects = userContext.projects.map(p => p.name).join(', ') || 'None';
    const teams = userContext.teams.map(t => t.name).join(', ') || 'None';
    const workspaces = userContext.workspaces.map(w => w.name).join(', ') || 'None';
    const teamMembersList = teamMembers
      ? teamMembers.map(m => m.name).join(', ')
      : 'Not loaded yet';

    return `Generate a personalized welcome message for a user starting the AI agent creation process.
  
  === AI BUILDER FLOW GUIDE (REFERENCE) ===
  ${AI_BUILDER_FLOW_GUIDE}
  === END OF FLOW GUIDE ===
  
  User Context:
  - Workspaces: ${workspaces}
  ${workspace ? `- Current Workspace: ${workspace.name} (Context: ${activeListsCount} lists, ${teamMembersList} members)` : ''}
  - Most Active List: ${mostActiveList || 'None'}
  - Projects: ${projects}
  - Teams: ${teams}
  
  RECRUITMENT & SCOPE PHILOSOPHY:
  1. DO NOT force the user into the current workspace. If they have only one workspace, you can say "Should we build for ${workspace?.name || 'your workspace'}?" but ALWAYS offer the Portable Template/Marketplace option as a peer choice.
  2. If the user has NO active entities or explicitly asks for flexibility, prioritize the **Portable Template** (Marketplace) path.
  3. Offer a clear, numbered first choice:
     - 1. Build for [Workspace/Project/etc.] (Specific Context)
     - 2. Create a Portable Template (Marketplace/Generic)
  
  Requirements (from flow guide):
  1. Be conversational and friendly.
  2. Present the choice of scope (Specific vs. Portable) EXPLICITLY and PROMINENTLY.
  3. Include numbered options (1, 2, 3, etc.) for starting points.
  4. Generate 3-5 follow-up options.
  5. Keep follow-ups concise (max 10 words each).
  6. ALL messages must be AI-generated - never use templates.
  
  Generate the welcome message with follow-ups.`;
  }

  buildWelcomeMessage(
    userContext: UserContext,
    userName?: string
  ): string {
    // Welcome message should be generated by AI, not predefined
    // This is a fallback - the AI should generate the actual welcome message
    const activeListsCount = userContext.workspace
      ? userContext.workspace.spaces.reduce(
        (sum, space) => sum + space.allLists.length,
        0
      )
      : 0;
    const workspaceName = userContext.workspace?.name || userContext.workspaces[0]?.name || 'your workspace';

    let message = `👋 Hi${userName ? ` ${userName}` : ''}! I'm the Agentflox Agent Builder.\n\n`;
    message += `I'm ready to help you build a custom AI agent. We can build it for a specific area of your workspace, or create a **Portable Template** for the marketplace!\n\n`;

    message += `To get started, what's your primary goal?\n\n`;
    message += `1. Build for ${workspaceName} (Specific Scope)\n`;
    message += `2. Create a Portable Agent (Marketplace/Template)\n`;
    message += `3. Task automation (General purpose)\n`;
    message += `4. Notification assistant\n`;
    message += `5. Something else (tell me your idea!)\n\n`;
    message += `Which path should we take?`;

    return message;
  }

  private getActiveListsSummary(userContext: UserContext): string {
    if (!userContext.workspace) {
      return 'Workspace details not loaded yet';
    }
    const lists = userContext.workspace.spaces.flatMap((space) =>
      space.allLists.map((list) => list.name)
    );
    return lists.slice(0, 10).join(', ') + (lists.length > 10 ? '...' : '');
  }

  private buildWorkspaceContext(userContext: UserContext): string {
    if (userContext.workspace) {
      const spaces = userContext.workspace.spaces.map((s) => s.name).join(', ');
      const teamMembers = userContext.teamMembers
        ? userContext.teamMembers.map((m) => m.name).join(', ')
        : 'Not loaded';
      return `WORKSPACE CONTEXT:
- Workspace: ${userContext.workspace.name}
- Available Spaces: ${spaces || 'None'}
- Team Members: ${teamMembers}`;
    }
    const workspaces = userContext.workspaces.map((w) => w.name).join(', ');
    return `WORKSPACE CONTEXT:
- Available Workspaces: ${workspaces || 'None'}
- Note: Detailed workspace structure will be loaded when scope is confirmed`;
  }

  private buildProjectContext(userContext: UserContext): string {
    const projects = userContext.projects.map((p) => p.name).join(', ') || 'None';
    let context = `PROJECTS:
- Available Projects: ${projects}`;

    if (userContext.projectDetails) {
      const projectTeams = userContext.projectDetails.teams.map((t) => t.name).join(', ') || 'None';
      const projectMembers = userContext.projectDetails.members.map((m) => m.name).join(', ') || 'None';
      context += `
- Selected Project: ${userContext.projectDetails.project.name}
- Project Teams: ${projectTeams}
- Project Members: ${projectMembers}`;
    }

    return context;
  }

  private buildTeamContext(userContext: UserContext): string {
    const teams = userContext.teams.map((t) => t.name).join(', ') || 'None';
    let context = `TEAMS:
- Available Teams: ${teams}`;

    if (userContext.teamDetails) {
      const teamMembers = userContext.teamDetails.members.map((m) => m.name).join(', ') || 'None';
      context += `
- Selected Team: ${userContext.teamDetails.team.name}
- Team Members: ${teamMembers}`;
    }

    return context;
  }

  private buildSpaceContext(userContext: UserContext): string {
    const spaces = userContext.spaces.map((s) => s.name).join(', ') || 'None';
    let context = `SPACES:
- Available Spaces: ${spaces}`;

    if (userContext.spaceDetails) {
      const spaceLists = userContext.spaceDetails.lists.map((l) => l.name).join(', ') || 'None';
      const folderCount = userContext.spaceDetails.folders.length;
      context += `
- Selected Space: ${userContext.spaceDetails.space.name}
- Lists: ${spaceLists}
- Folders: ${folderCount} folder${folderCount !== 1 ? 's' : ''}`;
    }

    return context;
  }

  private formatPatterns(
    patterns: Array<{ type: string; description: string; confidence?: number }>
  ): string {
    if (patterns.length === 0) return 'No patterns detected yet';
    return patterns.map((p) => `- ${p.description}`).join('\n');
  }
}

export const agentBuilderPromptService = new AgentBuilderPromptService();
