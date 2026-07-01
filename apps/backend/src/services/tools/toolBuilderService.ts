import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { toolBuilderStateService, ConversationState, ToolDraft } from './toolBuilderStateService';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs';
import * as path from 'path';

export class ToolBuilderService {
  async initializeConversation(
    userId: string,
    conversationId?: string,
    toolId?: string,
    skipWelcome?: boolean,
  ) {
    let conversationState: ConversationState;

    if (conversationId) {
      const existingState = await toolBuilderStateService.getConversationState(conversationId);
      if (!existingState) {
        throw new Error('Conversation not found');
      }
      if (existingState.userId !== userId) {
        throw new Error('Unauthorized');
      }
      conversationState = existingState;
    } else {
      conversationState = await toolBuilderStateService.createConversationState(userId, toolId);

      let generatedWelcome = "Hello! I'm the Tool Builder Assistant. Tell me what kind of tool you'd like to build, and I'll help you configure its API requests, Python scripts, or LLM nodes.";
      let followups: Array<{id: string, label: string}> = [];
      
      if (!skipWelcome) {
        try {
          const aiWelcome = await this.generateWelcomeMessage(userId);
          if (aiWelcome?.message) {
            generatedWelcome = aiWelcome.message;
            followups = aiWelcome.followups || [];
          }
        } catch (e) {
          console.error("Failed to generate AI welcome message", e);
        }
        
        await toolBuilderStateService.addMessageToHistory(
          conversationState.conversationId,
          'assistant',
          generatedWelcome,
          followups.length > 0 ? { followups } : undefined
        );
      }
    }

    if (toolId && toolId !== 'new') {
      const existingTool = await prisma.compositeTool.findFirst({
        where: { id: toolId, ownerId: userId },
      });
      if (!existingTool) {
        throw new Error('Access denied to tool');
      }
      if (conversationState.toolDraft.status === 'draft' && conversationState.toolDraft.steps?.length === 0) {
        conversationState.toolDraft.name = existingTool.name;
        conversationState.toolDraft.description = existingTool.description || undefined;
        conversationState.toolDraft.category = existingTool.category || undefined;
        conversationState.toolDraft.steps = existingTool.steps as any[] || [];
        await toolBuilderStateService.saveConversationState(conversationState);
      }
    }

    return {
      conversationId: conversationState.conversationId,
      conversationState,
      userContext: { userId },
      welcomeMessage: skipWelcome ? '' : (conversationState.conversationHistory[0]?.content || "Hello! I'm the Tool Builder Assistant."),
      quickActions: [],
      followups: skipWelcome ? [] : (conversationState.conversationHistory[0]?.metadata?.followups || []),
    };
  }

  private async generateWelcomeMessage(userId: string) {
    const modelData = await fetchModel();

    const systemPrompt = `You are a helpful Tool Builder Assistant.
Generate a concise, welcoming message for a user who wants to build a new Composite Tool.
A Composite Tool consists of sequential steps (LLM, API, PYTHON, or JAVASCRIPT).
Ask them what they want the tool to accomplish, and suggest one or two follow-up actions they could click.`;

    const responseSchema = z.object({
      message: z.string().describe("The welcome message text"),
      followups: z.array(z.object({
        id: z.string(),
        label: z.string()
      })).max(3).describe("Suggested quick actions or replies")
    });

    const completion = await openai.chat.completions.create({
      model: modelData.name,
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "welcome_message",
          strict: true,
          schema: zodToJsonSchema(responseSchema) as any
        }
      },
      temperature: 0.7,
    });

    try {
      const result = completion.choices[0].message.content;
      return JSON.parse(result || '{}');
    } catch {
      return {
        message: "Hello! I'm the Tool Builder Assistant. Tell me what kind of tool you'd like to build, and I'll help you configure its API requests, Python scripts, or LLM nodes.",
        followups: []
      };
    }
  }

  async processMessageAsync(
    conversationId: string,
    message: string,
    userId: string,
    options?: { attachments?: any[]; contexts?: any[]; mentions?: any[] }
  ) {
    // For now, async is just returning a fake runId and processing in background
    const runId = randomUUID();
    this.processMessage(conversationId, message, userId, undefined, undefined, options).catch(console.error);
    return { runId };
  }

  async processMessage(
    conversationId: string,
    message: string,
    userId: string,
    onThinking?: (step: string, node?: string) => void,
    onToken?: (text: string) => void,
    options?: { attachments?: any[]; contexts?: any[]; mentions?: any[] }
  ) {
    onThinking?.('Loading conversation...', 'INIT');
    const state = await toolBuilderStateService.getConversationState(conversationId);
    if (!state) throw new Error('Conversation not found');
    if (state.userId !== userId) throw new Error('Unauthorized');

    await toolBuilderStateService.addMessageToHistory(conversationId, 'user', message);
    
    onThinking?.('Analyzing request...', 'LLM');

    // Load SDK documentation
    let pythonSdkDocs = '';
    let jsSdkDocs = '';
    try {
      const promptsDir = path.join(process.cwd(), 'src', 'services', 'tools', 'prompts');
      pythonSdkDocs = fs.readFileSync(path.join(promptsDir, 'python_sdk.md'), 'utf-8');
      jsSdkDocs = fs.readFileSync(path.join(promptsDir, 'javascript_sdk.md'), 'utf-8');
    } catch (err) {
      console.warn("Could not load SDK prompts, continuing without them", err);
    }

    const systemPrompt = `You are an expert AI software architect building Composite Tools.
Your goal is to translate the user's request into a structured CompositeTool configuration.
A CompositeTool consists of sequential steps that run sequentially. Available step types:
- PYTHON: Runs isolated Python code. Requires config.code.
- JAVASCRIPT: Runs isolated JavaScript code. Requires config.code.
- LLM: Uses an LLM to process text. Requires config.prompt and config.model.
- API: Makes an HTTP request. Requires config.url, config.method, config.headers, config.body.
- SYSTEM_TOOL: Calls a registered system tool. Requires config.toolId and config.input.

Each step MUST have:
- id: a unique snake_case identifier (e.g., "extract_text", "summarize_pdf")
- name: a human-readable name
- type: one of PYTHON | JAVASCRIPT | LLM | API | SYSTEM_TOOL
- config: an object with the step-specific fields

DATA FLOW between steps (CRITICAL — applies to both PYTHON and JAVASCRIPT):
- The global \`params\` object is always available in every code step.
- It contains ALL tool input fields AND all previous step outputs merged by their step id.
- To access a tool input in Python: params.get('pdf_file_url')
- To access a tool input in JavaScript: params.pdf_file_url or params['pdf_file_url']
- To access a previous step's output (e.g., step id "extract_text"):
  - Python: params.get('extract_text') or params.get('extract_text_text') for nested field
  - JavaScript: params.extract_text or params['extract_text_text'] for nested field
- Steps are also available via the \`steps\` dict/object: steps['extract_text']['text']

PYTHON STEP CONVENTIONS (MANDATORY):
1. Add trace logs around key operations:
   print(f"<trace><title>Step title</title><data>{{'key': '{value}'}}</data></trace>")
2. Call platform helpers with: Helper("helper_name").call(param=value)
   Available helpers: file_to_text_llm_friendly, serper_google_search, etc.
3. Call LLMs with: LLM("openai-gpt-4.1").chat.completions.create(messages=[...])
   The response is a dict: response["choices"][0]["message"]["content"]
4. Tool inputs: params.get('key', 'default_value') or params['key']
5. End the step by assigning to result (NOT return):
   result = { "summary": summary, "url": params['pdf_file_url'] }

JAVASCRIPT STEP CONVENTIONS (MANDATORY):
1. Add trace logs using console.log with XML trace tags:
   console.log(\`<trace><title>Step title</title><data>\${JSON.stringify({key: value})}</data></trace>\`)
2. Call platform helpers with: Helper("helper_name").call({param: value})
   (Same helpers as Python: file_to_text_llm_friendly, serper_google_search, etc.)
3. Call LLMs with: LLM("openai-gpt-4.1").chat.completions.create({messages: [...]})
   The response is: response.choices[0].message.content
4. Tool inputs: params.key or params['key'] (JavaScript object dot/bracket access)
5. End the step by assigning to result (NOT return):
   result = { summary, url: params.pdf_file_url };

EXAMPLE PYTHON STEP CONFIG:
\`\`\`json
{
  "id": "summarize_pdf",
  "name": "Summarize PDF",
  "type": "PYTHON",
  "config": {
    "code": "pdf_url = params.get('pdf_file_url', '')\\nprint(f\\"<trace><title>Extracting PDF</title><data>{{\\'url\\': \\'{pdf_url}\\'}}</data></trace>\\")\\nextraction = Helper(\\"file_to_text_llm_friendly\\").call(file_url=pdf_url)\\npdf_text = extraction[\\"text\\"]\\nresponse = LLM(\\"openai-gpt-4.1\\").chat.completions.create(messages=[{\\"role\\": \\"user\\", \\"content\\": f\\"Summarize: {pdf_text}\\"}])\\nresult = {\\"summary\\": response[\\"choices\\"][0][\\"message\\"][\\"content\\"]}"
  }
}
\`\`\`

EXAMPLE JAVASCRIPT STEP CONFIG:
\`\`\`json
{
  "id": "summarize_pdf",
  "name": "Summarize PDF",
  "type": "JAVASCRIPT",
  "config": {
    "code": "const pdfUrl = params.pdf_file_url;\\nconsole.log(\`<trace><title>Extracting PDF</title><data>\${JSON.stringify({url: pdfUrl})}</data></trace>\`);\\nconst extraction = Helper('file_to_text_llm_friendly').call({file_url: pdfUrl});\\nconst pdfText = extraction.text;\\nconst response = LLM('openai-gpt-4.1').chat.completions.create({messages: [{role: 'user', content: \`Summarize: \${pdfText}\`}]});\\nresult = { summary: response.choices[0].message.content, url: pdfUrl };"
  }
}
\`\`\`

---
# SDK Documentation for Native Functions
You can use these native SDK functions in your generated code.

## Python SDK
${pythonSdkDocs}

## JavaScript SDK
${jsSdkDocs}
---

Analyze the user's request and the current draft. Update the draft to incorporate their requested features.
Current Draft:
${JSON.stringify(state.toolDraft, null, 2)}`;

    const explicitContextResolver = (await import('@/utils/utilities/explicitContextResolver')).explicitContextResolver;
    const explicitContextStr = await explicitContextResolver.resolve(userId, options);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
      ...(explicitContextStr ? [{ role: 'user', content: explicitContextStr }] : [])
    ] as any;

    const toolSchema = z.object({
      assistantResponse: z.string().describe("Your conversational response to the user explaining what you did."),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      systemPrompt: z.string().optional().describe("Standard Operating Procedure (SOP): a concise, plain-English operations guide describing WHAT the tool does, its main workflow, key steps, and expected output. This is NOT an AI system prompt — it is a human-readable summary of the tool's purpose and procedure, displayed in the tool's UI so users understand how it works before running it."),
      steps: z.array(z.object({
        id: z.string().describe("Unique snake_case identifier used as varName for cross-step references"),
        name: z.string().describe("Human-readable step name"),
        type: z.enum(['LLM', 'API', 'PYTHON', 'JAVASCRIPT', 'BRANCH', 'LOOP', 'MERGE']),
        config: z.record(z.any()).describe("Step configuration. For PYTHON/JAVASCRIPT: { code: string }. For LLM: { prompt, model }. For API: { url, method, headers, body }."),
      })).optional()
    });

    const modelData = await fetchModel();

    const completion = await openai.chat.completions.create({
      model: modelData.name,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tool_draft",
          strict: true,
          schema: zodToJsonSchema(toolSchema) as any
        }
      },
      temperature: 0.1,
    });

    onThinking?.('Applying updates...', 'SAVE');

    const result = completion.choices[0].message.content;
    let parsed: z.infer<typeof toolSchema>;
    
    try {
      parsed = JSON.parse(result || '{}');
    } catch {
      throw new Error("Failed to parse LLM output");
    }

    if (parsed.assistantResponse) {
      if (onToken) {
        onToken(parsed.assistantResponse);
      }
      await toolBuilderStateService.addMessageToHistory(conversationId, 'assistant', parsed.assistantResponse);
    }

    const updatedDraft = { ...state.toolDraft };
    if (parsed.name) updatedDraft.name = parsed.name;
    if (parsed.description) updatedDraft.description = parsed.description;
    if (parsed.category) updatedDraft.category = parsed.category;
    if (parsed.systemPrompt) updatedDraft.systemPrompt = parsed.systemPrompt; // SOP — Standard Operating Procedure
    if (parsed.steps) updatedDraft.steps = parsed.steps;

    state.toolDraft = updatedDraft;
    await toolBuilderStateService.saveConversationState(state);

    return {
      response: parsed.assistantResponse || 'Updated tool configuration.',
      conversationState: state,
      agentDraft: state.toolDraft, // Match frontend expectations which sometimes uses agentDraft
      toolDraft: state.toolDraft,
      followups: [
        { id: 'refine', label: 'Refine this further' },
        { id: 'test', label: 'Test the tool' }
      ]
    };
  }

  async updateDraft(conversationId: string, draftUpdates: any, userId: string) {
    const state = await toolBuilderStateService.getConversationState(conversationId);
    if (!state) throw new Error('Conversation not found');
    if (state.userId !== userId) throw new Error('Unauthorized');

    state.toolDraft = { ...state.toolDraft, ...draftUpdates };
    await toolBuilderStateService.saveConversationState(state);
    return state;
  }

  async launchTool(conversationId: string, toolId: string, userId: string) {
    const state = await toolBuilderStateService.getConversationState(conversationId);
    if (!state) throw new Error('Conversation not found');
    if (state.userId !== userId) throw new Error('Unauthorized');

    const draft = state.toolDraft;

    // Build functionSchema from existing one or extract params from code
    let functionSchema = draft.functionSchema || {};

    // If no functionSchema parameters defined yet, try to extract from step code
    if (!functionSchema?.parameters?.properties) {
      const codeStep = (draft.steps || []).find((s: any) => s.type === 'PYTHON' || s.type === 'JAVASCRIPT');
      const code: string = codeStep?.config?.code || '';
      if (code) {
        functionSchema = this.extractFunctionSchemaFromCode(code, draft.name, draft.description);
      }
    }

    const data: any = {
      name: draft.name || 'Untitled Tool',
      description: draft.description || '',
      category: draft.category || 'Custom',
      systemPrompt: draft.systemPrompt || '',
      steps: draft.steps || [],
      functionSchema,
      mode: draft.mode || 'AI',
      isPublic: draft.isPublic ?? true,
      ownerId: userId,
    };

    let resultTool;
    if (toolId && toolId !== 'new') {
      const owned = await prisma.compositeTool.findFirst({
        where: { id: toolId, ownerId: userId },
        select: { id: true },
      });
      if (!owned) {
        throw new Error('Access denied to tool');
      }
      resultTool = await prisma.compositeTool.update({
        where: { id: toolId },
        data,
      });
    } else {
      const firstWorkspace = await prisma.workspace.findFirst({
        where: { ownerId: userId, isActive: true },
      });
      resultTool = await prisma.compositeTool.create({
        data: {
          ...data,
          workspaceId: firstWorkspace?.id || '',
        },
      });
    }

    await toolBuilderStateService.deleteConversationState(userId, conversationId);

    return { success: true, tool: resultTool };
  }

  /**
   * Parses Python/JS code to extract params.get() calls and build a JSON Schema
   * for the tool's input parameters.
   */
  private extractFunctionSchemaFromCode(code: string, toolName?: string, toolDescription?: string): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    let order = 1;

    const toTitle = (key: string) =>
      key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const addProp = (key: string, defaultVal?: string) => {
      if (properties[key]) return;
      properties[key] = {
        type: 'string',
        title: toTitle(key),
        description: toTitle(key),
        order: order++,
        ...(defaultVal !== undefined ? { default: defaultVal } : {}),
      };
      if (defaultVal === undefined && !required.includes(key)) required.push(key);
    };

    // Python: params.get('key', 'default')
    const pyGetPattern = /params\.get\(\s*['"]([^'"]+)['"]\s*(?:,\s*([^)]+))?\)/g;
    // Python & JS: params['key'] or params["key"]
    const bracketPattern = /params\[['"]([^'"]+)['"]\]/g;
    // JS: params.key (dot access, not followed by ( to avoid methods)
    const jsDotPattern = /\bparams\.([a-zA-Z_][a-zA-Z0-9_]*)(?!\s*[(\[])/g;
    // JS: const { key } = params  or  const { key, key2 } = params
    const jsDestructurePattern = /const\s*\{([^}]+)\}\s*=\s*params/g;

    let match;

    while ((match = pyGetPattern.exec(code)) !== null) {
      const key = match[1];
      const defaultVal = match[2]?.trim().replace(/['"]/g, '') ?? undefined;
      addProp(key, defaultVal);
    }

    while ((match = bracketPattern.exec(code)) !== null) {
      addProp(match[1]);
    }

    while ((match = jsDotPattern.exec(code)) !== null) {
      const key = match[1];
      // Skip known globals
      if (!['get', 'has', 'keys', 'values', 'entries', 'pdf_file_url'].includes(key)) {
        addProp(key);
      }
    }

    while ((match = jsDestructurePattern.exec(code)) !== null) {
      const keys = match[1].split(',').map((k) => k.trim().split(':')[0].trim().replace(/=.*$/, '').trim());
      for (const key of keys) {
        if (key) addProp(key);
      }
    }

    return {
      name: toolName || 'tool',
      description: toolDescription || '',
      parameters: {
        type: 'object',
        properties,
        required,
      },
    };
  }
}

export const toolBuilderService = new ToolBuilderService();
