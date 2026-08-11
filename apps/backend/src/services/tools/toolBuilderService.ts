import { completeWithDefaultModel } from '@/services/models';
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
      // Caller passed an explicit conversationId — load it
      const existingState = await toolBuilderStateService.getConversationState(conversationId);
      if (!existingState) {
        throw new Error('Conversation not found');
      }
      if (existingState.userId !== userId) {
        throw new Error('Unauthorized');
      }
      conversationState = existingState;
    } else if (toolId && toolId !== 'new') {
      // No conversationId supplied but we have a toolId — look up the most recent
      // TOOL_BUILDER conversation already linked to this tool for this user.
      const existing = await prisma.aiConversation.findFirst({
        where: {
          userId,
          conversationType: 'TOOL_BUILDER',
          compositeToolId: toolId,
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      if (existing) {
        // Re-use the existing conversation (skips welcome message generation)
        const existingState = await toolBuilderStateService.getConversationState(existing.id);
        if (existingState && existingState.userId === userId) {
          conversationState = existingState;
        } else {
          // State missing from Redis/DB (e.g. TTL expired) — reconstruct minimal state
          conversationState = await toolBuilderStateService.createConversationState(userId, toolId);
        }
      } else {
        // First time opening this tool in the AI builder — create a fresh conversation
        conversationState = await toolBuilderStateService.createConversationState(userId, toolId);

        let generatedWelcome = "Hi! Ask me to customize your tool or let me know what you want it to do differently...";
        let followups: Array<{ id: string, label: string }> = [];

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
    } else {
      // No toolId and no conversationId — brand new tool being built from scratch
      conversationState = await toolBuilderStateService.createConversationState(userId, undefined);

      let generatedWelcome = "Hi! Ask me to customize your tool or let me know what you want it to do differently...";
      let followups: Array<{ id: string, label: string }> = [];

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
      welcomeMessage: skipWelcome ? '' : (conversationState.conversationHistory[0]?.content || "Hi! Ask me to customize your tool or let me know what you want it to do differently..."),
      quickActions: [],
      followups: skipWelcome ? [] : (conversationState.conversationHistory[0]?.metadata?.followups || []),
    };
  }

  private async generateWelcomeMessage(userId: string) {
    const systemPrompt = `You are a Tool Builder Assistant (like Relevance AI's tool builder).
Generate a short, inviting welcome inviting the user to describe or customize a tool.
Tone: friendly, concise, action-oriented — e.g. "Hi! Ask me to customize your tool or let me know what you want it to do differently..."
Also suggest 2–3 clickable starter ideas (web scraper, PDF summarizer, API integrator, etc.).`;

    const responseSchema = z.object({
      message: z.string().describe("The welcome message text"),
      followups: z.array(z.object({
        id: z.string(),
        label: z.string()
      })).max(3).describe("Suggested starter tool ideas the user can click")
    });

    const { completion } = await completeWithDefaultModel({
      userId,
      modelId: options?.modelId ?? undefined,
      request: {
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "welcome_message",
            schema: zodToJsonSchema(responseSchema) as any
          }
        },
        temperature: 0.7,
        stream: false,
      },
      usageContext: { action: 'GENERATE', metadata: { source: 'toolBuilderService.welcome' } },
      skipEntitlement: true,
    });

    try {
      const result = completion.choices[0].message.content;
      return JSON.parse(result || '{}');
    } catch {
      return {
        message: "Hi! Ask me to customize your tool or let me know what you want it to do differently...",
        followups: [
          { id: 'web_scraper', label: 'Build a web scraper' },
          { id: 'pdf_summarizer', label: 'Summarize a PDF' },
          { id: 'api_tool', label: 'Call an external API' },
        ]
      };
    }
  }

  async processMessageAsync(
    conversationId: string,
    message: string,
    userId: string,
    options?: { attachments?: any[]; contexts?: any[]; mentions?: any[]; modelId?: string | null }
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
    options?: { attachments?: any[]; contexts?: any[]; mentions?: any[]; modelId?: string | null }
  ) {
    onThinking?.('Loading conversation...', 'INIT');
    const state = await toolBuilderStateService.getConversationState(conversationId);
    if (!state) throw new Error('Conversation not found');
    if (state.userId !== userId) throw new Error('Unauthorized');

    // Persist composer model selection on the conversation for subsequent turns
    if (options?.modelId) {
      await prisma.aiConversation.update({
        where: { id: conversationId },
        data: { modelId: options.modelId },
      }).catch(() => { /* non-fatal */ });
    }

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

    const systemPrompt = `You are an expert Tool Builder Assistant (modeled after Relevance AI's tool builder).
Your job is to help users design production-ready Composite Tools through a smart, multi-turn conversation — NOT by jumping straight to code.

═══════════════════════════════════════════════════════════════
CONVERSATION PROTOCOL (CRITICAL — FOLLOW STRICTLY)
═══════════════════════════════════════════════════════════════

You operate in two modes. Decide based on whether you have ENOUGH DETAIL to build.

### MODE A — CLARIFY (default when requirements are incomplete)
When the user's request is vague or missing key details:
1. Acknowledge what they want enthusiastically.
2. Ask focused clarification questions BEFORE generating any steps/code.
3. Cover these dimensions (adapt to the tool type — skip what doesn't apply):
   - Scope: single vs multi-item? one URL vs crawl? one file vs batch?
   - Data to extract/process: main content? structured fields? links? metadata?
   - Output format: Markdown, HTML, JSON, plain text, CSV?
   - Inputs needed: URLs, file uploads, filters, limits — and ALWAYS ask which API keys / auth the user will provide (Firecrawl, Serper, OpenAI, etc.)
   - Constraints: page/item limits, rate limits, include/exclude paths, timeouts?
   - Integrations/helpers: which platform Helpers or external APIs? For each that needs a key, plan a dedicated \`*_api_key\` tool input.
4. Present questions as a clear numbered/bulleted list.
5. Provide clickable followups that answer common options (e.g. "Main content only", "Structured JSON", "Up to 50 pages").
6. OMIT name/description/category/systemPrompt/steps — do NOT invent a half-baked tool yet.
7. If the user partially answered, acknowledge what's known, ask ONLY for remaining gaps.
8. If the user asks a direct question (e.g. "what should the URL look like?", "what inputs do I need?"), ANSWER THAT QUESTION FIRST with concrete examples — do NOT rebuild or dump a tool draft.

Example clarification style:
"Great! I'll help you create a web scraper. Before I build it, I need to clarify a few things:

**Clarification Questions:**
1. What do you want to scrape?
   - A single page/URL?
   - Multiple pages from a website (crawl mode)?
2. What data do you want to extract?
   - Just the main content?
   - Specific structured data (product names, prices, links)?
3. Output format preference?
   - Markdown / HTML / Structured JSON / Raw HTML?
4. Do you have an API key for the scraping helper?
5. How many pages (if crawling)?

Please provide these details so I can build the perfect scraper for your needs!"

### MODE B — BUILD (only when you have enough detail)
Once the user has answered enough to build a solid tool:
1. Confirm you have what you need, then generate the full tool draft in the structured fields (name, steps, etc.).
2. Set name, description, category, systemPrompt (comprehensive SOP — see SOP FORMAT below), and complete steps with REAL code.
3. In assistantResponse, return ONLY a short human-readable Tool Summary — NEVER paste the raw tool JSON / draft object / schema:

**Tool Summary**
- Tool Name
- What it does (bullet list of capabilities)
- Inputs Required (required vs optional, with short descriptions + example values when helpful). ALWAYS list API key / auth inputs when the tool uses Firecrawl, Serper, LLM, or any third-party API.
- Output Structure (show a small example JSON shape only — not the whole tool draft)
- Key Features (checklist of what it supports)

4. End with suggested next actions as followups (e.g. "Refine inputs", "Add error handling", "Test the tool").

CRITICAL — assistantResponse rules (all modes):
- Answer the user's latest question directly and first.
- Do NOT dump status/mode/name/steps/functionSchema JSON in chat.
- Do NOT say "here's the complete tool draft" followed by JSON — the UI already shows the draft.
- For URL/input questions, give concrete examples, e.g.:
  - Public file URL: https://example.com/files/report.pdf
  - Signed/storage URL: https://storage.googleapis.com/.../doc.pdf?...
  - Not valid: a local path like C:\\Users\\...\\file.pdf (unless the platform supports uploads)

If the user says "just build it" / "use defaults" / gives enough specifics in one message, skip clarification and go straight to BUILD.

═══════════════════════════════════════════════════════════════
SOP FORMAT (systemPrompt field — MANDATORY in BUILD mode)
═══════════════════════════════════════════════════════════════

The \`systemPrompt\` field is a Standard Operating Procedure shown to users in the no-code UI.
It is NOT an LLM system prompt. Write clear, comprehensive plain English that an operator can follow.

ALWAYS structure the SOP with these exact section headings (use markdown **bold** labels):

**Tool Purpose:**
One or two sentences stating what the tool accomplishes end-to-end.

**Main Workflow:**
Numbered high-level stages (typically 2–5). Name helpers/APIs/LLMs used when known.

**Key Steps:**
Bullet list covering:
- Input: what the user must provide (URLs, files, options, API keys)
- Extract / Fetch / Gather: how data is obtained (helpers, APIs)
- Process: how data is transformed (LLM, code, filtering)
- Output: what is returned to the user

**Expected Output:**
Bullet list of returned fields and metadata (e.g. summary text, detected file type, counts).

Optional sections when useful (keep concise):
- **Assumptions / Constraints:** limits, auth requirements, public URL requirements
- **Error Handling:** what happens on invalid input or helper failures

Example SOP style (adapt content to the actual tool — do not copy verbatim):

**Tool Purpose:** Summarize the content of a PDF document.

**Main Workflow:**
1. Extract text from the PDF file using the file_to_text_llm_friendly helper
2. Pass the extracted text to an LLM to generate a concise summary
3. Return the summary to the user

**Key Steps:**
- Input: PDF file URL
- Extract: Use file_to_text_llm_friendly helper to convert PDF to text
- Process: Send extracted text to LLM with summarization prompt
- Output: Return the generated summary

**Expected Output:**
- Summary text of the PDF content
- Metadata about the extraction (detected file type)

Rules:
- Keep SOP aligned with the real steps/code you generate (same helpers, inputs, outputs).
- Prefer 150–600 words — comprehensive but scannable; avoid dumping raw code into the SOP.
- Use concrete names (helper ids, input field names) so the UI SOP matches runtime behavior.

═══════════════════════════════════════════════════════════════
TOOL ARCHITECTURE
═══════════════════════════════════════════════════════════════

A CompositeTool consists of sequential steps. Available step types:
- PYTHON: Runs isolated Python code. Requires config.code.
- JAVASCRIPT: Runs isolated JavaScript code. Requires config.code.
- LLM: Uses an LLM to process text. Requires config.prompt and config.model.
- API: Makes an HTTP request. Requires config.url, config.method, config.headers, config.body.
- SYSTEM_TOOL: Calls a registered system tool. Requires config.toolId and config.input.

Each step MUST have:
- id: a unique snake_case identifier (e.g., "extract_text", "scrape_website")
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

═══════════════════════════════════════════════════════════════
CODE QUALITY (MANDATORY — NO PLACEHOLDERS)
═══════════════════════════════════════════════════════════════

Generated PYTHON/JAVASCRIPT code MUST be fully functional and production-ready:
- NEVER write placeholder code, stubs, TODOs, "pass", "// implement later", or pseudo-code.
- NEVER leave Helper/LLM/API calls as comments — call them for real.
- Implement complete logic: input validation, Helper/LLM/API calls, response processing, structured output.
- Use real params keys that become tool input fields (e.g. website_url, firecrawl_api_key, page_limit).
- Structure a clear results object with status, data, and summary metadata.
- Handle optional params with sensible defaults via params.get().

AUTH / API KEY INPUTS (MANDATORY when using paid or third-party services):
When generated code uses ANY of the following, you MUST also create a matching REQUIRED tool input and pass it into the Helper/LLM call from params — never hardcode secrets and never rely only on server env:
- Helper("firecrawl") → required input \`firecrawl_api_key\` (string, API key). Pass as api_key=params["firecrawl_api_key"] (or firecrawl_api_key=...).
- Helper("serper_google_search") → required input \`serper_api_key\`. Pass as api_key=params["serper_api_key"].
- LLM(...) / prompt_completion / Helper("llm") → required input \`openai_api_key\`. Pass api_key=params["openai_api_key"] into .create(...) / Helper.call(...).
- Helper("integration") / external HTTP APIs → required inputs for that provider's token/key (e.g. \`api_key\`, \`access_token\`).
- Any other third-party API the tool calls → add a clearly named \`*_api_key\` or \`*_token\` input and wire it through params.
In the BUILD Tool Summary, list these auth inputs explicitly (e.g. "Inputs: website_url, firecrawl_api_key").
Prefer specific names (firecrawl_api_key, serper_api_key, openai_api_key) over a generic api_key when multiple keys could appear.

PYTHON STEP CONVENTIONS (MANDATORY):
1. Add trace logs around key operations:
   print(f"<trace><title>Step title</title><data>{{'key': value}}</data></trace>")
   Prefer json.dumps for complex data in traces.
2. Call platform helpers with: Helper("helper_name").call(param=value)
   Available helpers: file_to_text_llm_friendly (alias file_to_text), serper_google_search, firecrawl,
   prompt_completion, llm, insert_temp_file. Datasets (insert_data/retrieve_*) and Integration OAuth
   return clear not-configured errors until enabled.
   Catalog: GET /v1/platform-helpers
   ALWAYS pass user API keys from params into Helper.call when the helper needs auth (see AUTH section).
3. Call LLMs with: LLM("openai-gpt-4.1").chat.completions.create(messages=[...], api_key=params["openai_api_key"])
   The response is a dict: response["choices"][0]["message"]["content"]
4. Tool inputs: params.get('key', default) or params['key'] for required fields (including *_api_key fields)
5. End the step by assigning to result (NOT return):
   result = { "status": "success", "pages": structured_pages, "summary": {...} }

JAVASCRIPT STEP CONVENTIONS (MANDATORY):
1. Add trace logs using console.log with XML trace tags:
   console.log(\`<trace><title>Step title</title><data>\${JSON.stringify({key: value})}</data></trace>\`)
2. Call platform helpers with: Helper("helper_name").call({param: value})
   Available: file_to_text_llm_friendly, serper_google_search, firecrawl, prompt_completion, llm, insert_temp_file.
   Catalog: GET /v1/platform-helpers
   ALWAYS pass user API keys from params into Helper.call when the helper needs auth (see AUTH section).
3. Call LLMs with: LLM("openai-gpt-4.1").chat.completions.create({messages: [...], api_key: params.openai_api_key})
   The response is: response.choices[0].message.content
4. Tool inputs: params.key or params['key'] (including *_api_key fields)
5. End the step by assigning to result (NOT return):
   result = { status: "success", pages: structuredPages, summary: {...} };

EXAMPLE of production-quality PYTHON (web scraper pattern):
\`\`\`python
import json

print(f"<trace><title>Starting multi-page website scraper</title><data>{json.dumps({'website_url': params['website_url'], 'page_limit': params.get('page_limit', 50)})}</data></trace>")

firecrawl_params = {
    "url": params["website_url"],
    "scrape_only": False,
    "extract_main_content_only": True,
    "scrape_output_formats": ["json"],
    "page_limit": int(params.get("page_limit", 50)),
    "api_key": params["firecrawl_api_key"],
}
if params.get("include_paths"):
    firecrawl_params["include_paths"] = params["include_paths"]
if params.get("exclude_paths"):
    firecrawl_params["exclude_paths"] = params["exclude_paths"]

print(f"<trace><title>Calling Firecrawl helper</title><data>{json.dumps({k: v for k, v in firecrawl_params.items() if k != 'api_key'})}</data></trace>")
response = Helper("firecrawl").call(**firecrawl_params)

pages_data = response.get("data", [])
total_pages = response.get("total", len(pages_data))
structured_pages = []
for page in pages_data:
    content = page.get("content", "") or ""
    structured_pages.append({
        "url": page.get("url", ""),
        "title": page.get("title", ""),
        "content": content,
        "markdown": page.get("markdown", ""),
        "metadata": {
            "word_count": len(content.split()),
            "character_count": len(content),
        },
    })

result = {
    "status": "success",
    "total_pages_scraped": total_pages,
    "pages": structured_pages,
    "summary": {
        "website_url": params["website_url"],
        "total_pages": total_pages,
        "credits_used": response.get("credits_cost"),
        "user_key_used": response.get("user_key_used"),
    },
}
\`\`\`

EXAMPLE PYTHON STEP CONFIG (PDF summarizer):
\`\`\`json
{
  "id": "summarize_pdf",
  "name": "Summarize PDF",
  "type": "PYTHON",
  "config": {
    "code": "pdf_url = params.get('pdf_file_url', '')\\nopenai_key = params['openai_api_key']\\nprint(f\\"<trace><title>Extracting PDF</title><data>{{\\'url\\': \\'{pdf_url}\\'}}</data></trace>\\")\\nextraction = Helper(\\"file_to_text_llm_friendly\\").call(file_url=pdf_url)\\npdf_text = extraction[\\"text\\"]\\nresponse = LLM(\\"openai-gpt-4.1\\").chat.completions.create(messages=[{\\"role\\": \\"user\\", \\"content\\": f\\"Summarize: {pdf_text}\\"}], api_key=openai_key)\\nresult = {\\"summary\\": response[\\"choices\\"][0][\\"message\\"][\\"content\\"]}"
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
    "code": "const pdfUrl = params.pdf_file_url;\\nconst openaiKey = params.openai_api_key;\\nconsole.log(\`<trace><title>Extracting PDF</title><data>\${JSON.stringify({url: pdfUrl})}</data></trace>\`);\\nconst extraction = await Helper('file_to_text_llm_friendly').call({file_url: pdfUrl});\\nconst pdfText = extraction.text;\\nconst response = await LLM('openai-gpt-4.1').chat.completions.create({messages: [{role: 'user', content: \`Summarize: \${pdfText}\`}], api_key: openaiKey});\\nresult = { summary: response.choices[0].message.content, url: pdfUrl };"
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

Current Draft:
${JSON.stringify(state.toolDraft, null, 2)}

Remember:
- Answer the user's latest question directly before anything else.
- CLARIFY first when details are missing — omit steps.
- BUILD only with complete, executable code — never placeholders.
- After building, return a clear Tool Summary in assistantResponse — NEVER paste the raw tool draft JSON.
- Always include useful followups (answers to your questions, or next actions after build).`;

    const explicitContextResolver = (await import('@/utils/utilities/explicitContextResolver')).explicitContextResolver;
    const explicitContextStr = await explicitContextResolver.resolve(userId, options);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
      ...(explicitContextStr ? [{ role: 'user', content: explicitContextStr }] : [])
    ] as any;

    const toolSchema = z.object({
      assistantResponse: z.string().describe(
        "Human chat reply only. Answer the user's latest question directly first. In CLARIFY: ask focused questions. In BUILD: short Tool Summary (name, what it does, inputs with example values, output shape, features). NEVER include raw tool draft JSON (no status/mode/steps/functionSchema dumps)."
      ),
      mode: z.enum(['clarify', 'build']).describe(
        "clarify = asking follow-up questions (omit tool fields/steps). build = generating or updating the full tool draft."
      ),
      followups: z.array(z.object({
        id: z.string().describe("Short snake_case id"),
        label: z.string().describe("Clickable reply text, max ~80 chars"),
      })).max(6).describe(
        "In clarify mode: concrete answers to your questions (e.g. 'Multiple pages / crawl', 'Structured JSON', 'Up to 50 pages'). In build mode: next actions (e.g. 'Refine inputs', 'Add path filters', 'Test the tool')."
      ),
      name: z.string().optional().describe("Tool name — only in build mode"),
      description: z.string().optional().describe("Short tool description — only in build mode"),
      category: z.string().optional().describe("Tool category — only in build mode"),
      systemPrompt: z.string().optional().describe(
        "Comprehensive Standard Operating Procedure for the no-code UI (BUILD mode only). " +
        "Human-readable operator guide — NOT an LLM system prompt. MUST include these sections with bold headings: " +
        "**Tool Purpose:** (what it does), " +
        "**Main Workflow:** (numbered stages naming helpers/LLM/APIs), " +
        "**Key Steps:** (Input / Extract / Process / Output bullets with concrete field and helper names), " +
        "**Expected Output:** (returned fields + metadata). " +
        "Optional: Assumptions/Constraints, Error Handling. Align with generated steps. 150–600 words, no raw code dumps."
      ),
      steps: z.array(z.object({
        id: z.string().describe("Unique snake_case identifier used as varName for cross-step references"),
        name: z.string().describe("Human-readable step name"),
        type: z.enum(['LLM', 'API', 'PYTHON', 'JAVASCRIPT', 'BRANCH', 'LOOP', 'MERGE']),
        config: z.object({
          code: z.string().optional().describe(
            "FULL executable source for PYTHON/JAVASCRIPT. Must be production-ready — no placeholders, TODOs, or stubs. Include traces, real Helper/LLM calls, and a structured result assignment."
          ),
          prompt: z.string().optional().describe("The prompt for LLM steps."),
          model: z.string().optional().describe("The model for LLM steps."),
          url: z.string().optional().describe("The URL for API steps."),
          method: z.string().optional().describe("The HTTP method for API steps."),
          headers: z.record(z.string()).optional().describe("The HTTP headers for API steps."),
          body: z.string().optional().describe("The HTTP request body for API steps."),
          toolId: z.string().optional().describe("The tool ID for SYSTEM_TOOL steps."),
          input: z.string().optional().describe("The input for SYSTEM_TOOL steps.")
        }).describe("Step configuration. For PYTHON/JAVASCRIPT: { code: string }. For LLM: { prompt, model }. For API: { url, method, headers, body }."),
      })).optional().describe(
        "Full steps array — ONLY in build mode, with real executable code. OMIT entirely (or leave empty) when mode is clarify."
      ),
    });

    // Resolve selected model: request override → conversation.modelId → default
    let selectedModelId = options?.modelId ?? null;
    if (!selectedModelId) {
      const conv = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        select: { modelId: true },
      });
      selectedModelId = conv?.modelId ?? null;
    }

    const { completion } = await completeWithDefaultModel({
      userId,
      modelId: selectedModelId,
      request: {
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tool_draft",
            schema: zodToJsonSchema(toolSchema) as any
          }
        },
        temperature: 0.2,
        stream: false,
      },
      usageContext: {
        action: 'GENERATE',
        conversationId,
        metadata: { source: 'toolBuilderService.draft' },
      },
      skipEntitlement: true,
    });

    onThinking?.('Applying updates...', 'SAVE');

    const result = completion.choices[0].message.content;
    let parsed: z.infer<typeof toolSchema>;

    try {
      parsed = this.normalizeToolBuilderResponse(JSON.parse(result || '{}'));
    } catch {
      throw new Error("Failed to parse LLM output");
    }

    const followups = Array.isArray(parsed.followups) ? parsed.followups : [];
    if (typeof parsed.assistantResponse === 'string') {
      parsed.assistantResponse = this.sanitizeAssistantResponse(parsed.assistantResponse);
    }

    if (parsed.assistantResponse) {
      if (onToken) {
        onToken(parsed.assistantResponse);
      }
      await toolBuilderStateService.addMessageToHistory(
        conversationId,
        'assistant',
        parsed.assistantResponse,
        followups.length > 0 ? { followups } : undefined,
      );
    }

    const isBuildMode = parsed.mode === 'build' || (Array.isArray(parsed.steps) && parsed.steps.length > 0);

    const updatedDraft = { ...state.toolDraft };
    if (isBuildMode) {
      if (parsed.name) updatedDraft.name = parsed.name;
      if (parsed.description) updatedDraft.description = parsed.description;
      if (parsed.category) updatedDraft.category = parsed.category;
      if (parsed.systemPrompt) updatedDraft.systemPrompt = parsed.systemPrompt;
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        updatedDraft.steps = parsed.steps;
      }
    }

    // Derive tool inputs from generated step code so the builder UI has a functionSchema
    // without waiting for launch.
    if (updatedDraft.steps?.length) {
      const codeStep = updatedDraft.steps.find(
        (s: any) => s.type === 'PYTHON' || s.type === 'JAVASCRIPT'
      );
      const code: string = codeStep?.config?.code || '';
      if (code) {
        updatedDraft.functionSchema = this.extractFunctionSchemaFromCode(
          code,
          updatedDraft.name,
          updatedDraft.description,
        );
      }
    }

    state.toolDraft = updatedDraft;
    if (isBuildMode && updatedDraft.steps?.length) {
      state.stage = 'configuration';
    }
    await toolBuilderStateService.saveConversationState(state);

    // Persist draft onto the linked CompositeTool so Build mode (code + inputs) updates live
    if (isBuildMode) {
      await this.syncToolToDatabase(conversationId, updatedDraft, userId);
    }

    const defaultFollowups = isBuildMode
      ? [
          { id: 'refine', label: 'Refine this further' },
          { id: 'test', label: 'Test the tool' },
        ]
      : [
          { id: 'use_defaults', label: 'Use sensible defaults and build' },
        ];

    return {
      response: parsed.assistantResponse || 'Updated tool configuration.',
      conversationState: state,
      agentDraft: state.toolDraft, // Match frontend expectations which sometimes uses agentDraft
      toolDraft: state.toolDraft,
      followups: followups.length > 0 ? followups : defaultFollowups,
    };
  }

  /**
   * Mirror agent-builder sync: write the in-progress draft onto the CompositeTool
   * linked to this conversation so the UI can show code + inputs immediately.
   */
  private async syncToolToDatabase(
    conversationId: string,
    draft: ToolDraft,
    userId: string,
  ): Promise<void> {
    try {
      const conversation = await prisma.aiConversation.findUnique({
        where: { id: conversationId },
        select: { compositeToolId: true },
      });
      const toolId = conversation?.compositeToolId;
      if (!toolId) return;

      let functionSchema = draft.functionSchema || {};
      if (!functionSchema?.parameters?.properties && draft.steps?.length) {
        const codeStep = draft.steps.find(
          (s: any) => s.type === 'PYTHON' || s.type === 'JAVASCRIPT'
        );
        const code: string = codeStep?.config?.code || '';
        if (code) {
          functionSchema = this.extractFunctionSchemaFromCode(
            code,
            draft.name,
            draft.description,
          );
        }
      }

      await prisma.compositeTool.updateMany({
        where: { id: toolId, ownerId: userId },
        data: {
          ...(draft.name ? { name: draft.name } : {}),
          ...(draft.description !== undefined ? { description: draft.description } : {}),
          ...(draft.category ? { category: draft.category } : {}),
          ...(draft.systemPrompt !== undefined ? { systemPrompt: draft.systemPrompt } : {}),
          ...(draft.steps ? { steps: draft.steps as any } : {}),
          functionSchema: functionSchema as any,
          mode: draft.mode || 'AI',
        },
      });
    } catch (error) {
      console.error('[ToolBuilder] Failed to sync tool draft to database:', error);
    }
  }

  private sanitizeAssistantResponse(text: string): string {
    if (!text) return text;

    let cleaned = text
      // Remove fenced blocks that look like full tool drafts
      .replace(/```(?:json)?\s*\{[\s\S]*?"(?:steps|functionSchema|mode)"[\s\S]*?\}\s*```/gi, '')
      // Remove "here's the complete tool draft" style lead-ins left hanging
      .replace(/\n*(?:now,?\s*)?(?:here(?:'s| is)\s+the\s+complete\s+tool\s+draft)\s*:?\s*/gi, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If the whole reply collapsed into a raw draft object, replace with a short summary
    if (/^\s*\{[\s\S]*"(?:steps|functionSchema)"[\s\S]*\}\s*$/.test(cleaned)) {
      return 'The tool draft is ready in the builder panel. Tell me what you want to change, or ask how to fill any input (for example what a PDF URL should look like).';
    }

    return cleaned || 'Updated the tool draft. Ask if you need help with inputs, testing, or refinements.';
  }

  private normalizeToolBuilderResponse(raw: any): any {
    if (!raw || typeof raw !== 'object') return raw;

    if (raw.properties && typeof raw.properties === 'object') {
      const props = raw.properties;
      if (
        'assistantResponse' in props ||
        'mode' in props ||
        'followups' in props ||
        'steps' in props
      ) {
        return props;
      }
    }

    if (raw.value && typeof raw.value === 'object') {
      return this.normalizeToolBuilderResponse(raw.value);
    }

    if (Array.isArray(raw.output) && raw.output.length === 1 && typeof raw.output[0] === 'object') {
      return this.normalizeToolBuilderResponse(raw.output[0]);
    }

    return raw;
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
      const isSecret =
        /(^|_)(api_key|apikey|access_token|secret|password|token)$/i.test(key) ||
        /_api_key$/i.test(key) ||
        key === 'api_key' ||
        key === 'openai_api_key' ||
        key === 'serper_api_key' ||
        key === 'firecrawl_api_key';
      properties[key] = {
        type: 'string',
        title: toTitle(key),
        description: isSecret
          ? `${toTitle(key)} (secret — entered by the user at run time)`
          : toTitle(key),
        order: order++,
        ...(isSecret ? { 'x-uiType': 'api_key' } : {}),
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
