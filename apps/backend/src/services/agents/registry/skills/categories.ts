import { SkillDefinition } from '../core/SkillRegistryManager';

/**
 * Built-in skills for agent capabilities
 * Configured with rich structured schemas (purpose, workflow, safety, output templates, trigger examples, and tags)
 */
export const BUILT_IN_SKILLS: SkillDefinition[] = [
    // ==========================================
    // === CREATIVE & CONTENT SKILLS ===
    // ==========================================
    {
        name: 'content_creation',
        displayName: 'Content Creation & Writing',
        description: 'Create high-impact blog posts, technical articles, user guides, and long-form content',
        category: 'creative',
        icon: '✍️',
        tags: ['writing', 'blogging', 'documentation', 'content-strategy'],
        isBuiltIn: true,
        schema: {
            purpose: 'Draft clear, engaging, and well-structured written content tailored to specific audience tiers and editorial tones.',
            workflow: [
                {
                    step: 1,
                    title: 'Audience & Scope Clarification',
                    description: 'Analyze topic, target audience, tone of voice, formatting constraints, and core message goals.',
                },
                {
                    step: 2,
                    title: 'Outline & Thesis Formulation',
                    description: 'Structure key sections, sub-headings, argumentative flow, and key takeaways.',
                },
                {
                    step: 3,
                    title: 'Drafting with Value-Add Depth',
                    description: 'Generate high-signal content with illustrative examples, concrete data points, and actionable takeaways while avoiding generic filler.',
                },
                {
                    step: 4,
                    title: 'Editorial Polish & Formatting',
                    description: 'Review readability, narrative pacing, SEO/keyword natural integration, and clean markdown hierarchy.',
                },
            ],
            safetyAndSideEffects: 'Ensure factual claims are verifiable. Provide drafts for user sign-off before publishing to live distribution channels or CMS endpoints.',
            outputTemplate: `# [Title]

> **Summary:** [1-2 sentence executive overview]

## [Section 1: Context & Core Problem]
...

## [Section 2: Key Insights & Breakdown]
- **[Point A]:** ...
- **[Point B]:** ...

## [Section 3: Practical Application / Next Steps]
1. ...
2. ...

---
*Target Audience: [Audience] | Tone: [Tone]*`,
            triggerExamples: [
                'Write an in-depth article about microservices architecture.',
                'Draft a technical blog post explaining vector databases.',
                'Create a comprehensive user guide for our onboarding flow.',
                'Write a thought-leadership piece on autonomous AI agents.',
            ],
        },
    },
    {
        name: 'copywriting_marketing',
        displayName: 'Copywriting & Marketing',
        description: 'Craft compelling landing page copy, email sequences, product announcements, and social campaigns',
        category: 'creative',
        icon: '📢',
        tags: ['marketing', 'copywriting', 'conversion', 'campaigns'],
        isBuiltIn: true,
        schema: {
            purpose: 'Produce conversion-focused, persuasive copy for products, campaigns, email nurture sequences, and marketing channels.',
            workflow: [
                {
                    step: 1,
                    title: 'Value Proposition & Positioning',
                    description: 'Identify customer pain points, unique selling points (USPs), target persona, and the primary call-to-action (CTA).',
                },
                {
                    step: 2,
                    title: 'Hook & Headline Generation',
                    description: 'Develop high-converting hook variants, headlines, and sub-headers using proven copywriting frameworks (AIDA, PAS, BAB).',
                },
                {
                    step: 3,
                    title: 'Body Copy & Social Proof Structuring',
                    description: 'Draft concise benefits-oriented copy highlighting features, outcomes, objections handling, and credibility proof.',
                },
                {
                    step: 4,
                    title: 'CTA & Friction Reduction',
                    description: 'Craft clear, action-oriented CTAs with minimal user friction and clear expectations.',
                },
            ],
            safetyAndSideEffects: 'Never make misleading or unsubstantiated product claims. Adhere to compliance regulations and brand voice guidelines.',
            outputTemplate: `### 🎯 Campaign / Copy Concept: [Title]

**Target Persona:** [Persona]  
**Core Value Prop:** [One-sentence USP]  

---
#### 🪝 Headline Options:
1. **Option A (Outcome-focused):** ...
2. **Option B (Pain-focused):** ...
3. **Option C (Direct & Punchy):** ...

#### 📝 Body & Key Selling Points:
- **[Benefit 1]:** ...
- **[Benefit 2]:** ...

#### 🚀 Primary Call-to-Action (CTA):
> **[Action Button Text]** — *[Microcopy subtext]*`,
            triggerExamples: [
                'Write landing page copy for our new AI workflow builder.',
                'Draft a 3-part welcome email sequence for new SaaS signups.',
                'Create product launch announcements for Twitter and LinkedIn.',
                'Generate high-converting headlines for our pricing page.',
            ],
        },
    },
    {
        name: 'media_generation',
        displayName: 'Media Generation & Prompts',
        description: 'Generate high-fidelity AI imagery prompts, audio voiceover scripts, and multimedia assets',
        category: 'creative',
        icon: '🎨',
        tags: ['image-generation', 'multimedia', 'audio', 'prompt-crafting'],
        isBuiltIn: true,
        schema: {
            purpose: 'Design detailed prompt configurations, visual styles, and speech parameters for AI media generation pipelines.',
            workflow: [
                {
                    step: 1,
                    title: 'Visual Concept & Style Definition',
                    description: 'Determine artistic medium (cinematic, photorealistic, 3D render, digital illustration), lighting, perspective, and aspect ratio.',
                },
                {
                    step: 2,
                    title: 'Detailed Prompt Engineering',
                    description: 'Formulate subject description, atmospheric lighting, color palette, camera lens, render engine, and negative prompts.',
                },
                {
                    step: 3,
                    title: 'Audio / Voiceover Synthesis',
                    description: 'Structure voiceover text with timing cues, emphasis markings, speaker tone, and phonetic hints when needed.',
                },
            ],
            safetyAndSideEffects: 'Adhere to content safety policies regarding copyright, sensitive topics, and brand consistency.',
            outputTemplate: `### 🎨 Media Asset Specification

**Asset Type:** [Image / Audio / Video]  
**Style/Theme:** [e.g., Cinematic 3D Render, Cyberpunk Minimalism]  
**Dimensions/Aspect Ratio:** [e.g., 16:9, 1:1, 9:16]  

#### 🖼️ Primary Prompt:
\`\`\`
[Subject], [Environment/Setting], [Lighting & Color Palette], [Composition & Camera Angle], [Aesthetic Style/Engine Details]
\`\`\`

#### 🚫 Negative Prompt:
\`\`\`
[Excluded artifacts, blur, distortions, low quality]
\`\`\``,
            triggerExamples: [
                'Generate visual prompts for an AI-powered SaaS dashboard.',
                'Create text-to-speech voiceover script for product onboarding.',
                'Design cinematic cover imagery for a tech announcement.',
            ],
        },
    },

    // ==========================================
    // === TECHNICAL & ENGINEERING SKILLS ===
    // ==========================================
    {
        name: 'code_operations',
        displayName: 'Code Engineering & Architecture',
        description: 'Design, implement, modularize, and verify production-grade software across modern stacks',
        category: 'technical',
        icon: '💻',
        tags: ['development', 'typescript', 'backend', 'frontend', 'architecture'],
        isBuiltIn: true,
        schema: {
            purpose: 'Write clean, robust, type-safe, and modular code adhering to modern software engineering patterns and project conventions.',
            workflow: [
                {
                    step: 1,
                    title: 'Requirement & Interface Design',
                    description: 'Clarify API contracts, data models, edge cases, error boundaries, and dependency interactions before implementation.',
                },
                {
                    step: 2,
                    title: 'Implementation with Idiomatic Patterns',
                    description: 'Write type-safe, idiomatic code adhering strictly to existing codebase architectures and conventions.',
                },
                {
                    step: 3,
                    title: 'Defensive Error Handling',
                    description: 'Incorporate graceful failure handling, input validation, logging, and performance considerations.',
                },
                {
                    step: 4,
                    title: 'Self-Verification & Testability',
                    description: 'Check for potential regressions, async race conditions, resource leaks, and type correctness.',
                },
            ],
            safetyAndSideEffects: 'Do not introduce unvetted third-party packages or destructive schema/file alterations without validation.',
            outputTemplate: `### 🛠️ Implementation Plan & Code

#### 📐 Architectural Overview:
- **Module/File:** \`[path/to/file]\`
- **Key Types & Contracts:** [Summary of interfaces]

#### 💻 Source Code:
\`\`\`[language]
// Implementation with full type annotations and comments
\`\`\`

#### 🧪 Verification & Edge Cases:
- [Edge Case 1]: ...
- [Edge Case 2]: ...`,
            triggerExamples: [
                'Implement an async rate-limiter in TypeScript using Redis.',
                'Create a resilient tRPC router procedure with Zod input validation.',
                'Build a reusable React state management hook with optimistic updates.',
                'Scaffold a microservice event handler with idempotency keys.',
            ],
        },
    },
    {
        name: 'code_review_refactoring',
        displayName: 'Code Review & Refactoring',
        description: 'Analyze codebases for anti-patterns, security risks, performance bottlenecks, and architectural debt',
        category: 'technical',
        icon: '🔍',
        tags: ['code-review', 'refactoring', 'clean-code', 'security', 'performance'],
        isBuiltIn: true,
        schema: {
            purpose: 'Conduct thorough code quality assessments and systematic refactoring to enhance readability, performance, and maintainability.',
            workflow: [
                {
                    step: 1,
                    title: 'Structural & Security Audit',
                    description: 'Scan code for security vulnerabilities, memory/concurrency leaks, unhandled promises, and anti-patterns.',
                },
                {
                    step: 2,
                    title: 'Performance & Complexity Assessment',
                    description: 'Identify unnecessary re-renders, N+1 queries, redundant allocations, and excessive cyclomatic complexity.',
                },
                {
                    step: 3,
                    title: 'Actionable Refactoring Recommendations',
                    description: 'Provide surgical before-and-after diffs with clear rationale and preservation of behavioral compatibility.',
                },
            ],
            safetyAndSideEffects: 'Preserve existing behavior and API contracts unless explicit breaking changes are requested.',
            outputTemplate: `### 🔎 Code Review & Recommendations

#### 🛡️ Critical Issues & Vulnerabilities:
- [Issue Description] — *[Severity: High/Med/Low]*: [Fix]

#### ⚡ Performance & Maintainability:
- [Optimization Opportunity]: [Explanation]

#### 🔄 Proposed Refactoring:
\`\`\`diff
- [Original code]
+ [Refactored code]
\`\`\``,
            triggerExamples: [
                'Review this pull request for race conditions and memory leaks.',
                'Refactor this monolithic handler into clean decoupled services.',
                'Optimize database query execution and reduce redundant API calls.',
            ],
        },
    },
    {
        name: 'debugging_troubleshooting',
        displayName: 'Debugging & Root Cause Analysis',
        description: 'Isolate root causes, analyze stack traces, fix regressions, and establish preventive guards',
        category: 'technical',
        icon: '🐛',
        tags: ['debugging', 'troubleshooting', 'root-cause', 'error-handling'],
        isBuiltIn: true,
        schema: {
            purpose: 'Diagnose runtime errors, silent failures, and unexpected behaviors systematically using evidence-based debugging.',
            workflow: [
                {
                    step: 1,
                    title: 'Reproduction & Symptom Isolation',
                    description: 'Inspect stack traces, error messages, environmental state, and input payloads to reproduce the failure mode.',
                },
                {
                    step: 2,
                    title: 'Root Cause Identification',
                    description: 'Trace data flow and execution path to pinpoint the exact failure mechanism (null-pointers, race conditions, type mismatches, stale state).',
                },
                {
                    step: 3,
                    title: 'Surgical Fix & Regression Prevention',
                    description: 'Implement a targeted patch and outline defensive assertions/tests to prevent recurrence.',
                },
            ],
            safetyAndSideEffects: 'Avoid quick-fix masking of errors (e.g., blanket try-catch or unprincipled any-casting) without resolving root causes.',
            outputTemplate: `### 🐞 Root Cause Analysis & Fix

**Problem Statement:** [Clear description of failure]  
**Root Cause:** [Technical explanation of the fault mechanism]  

#### 🔧 Fix:
\`\`\`[language]
// Corrected implementation
\`\`\`

#### 🛡️ Preventive Measures:
- [Step to prevent recurrence]`,
            triggerExamples: [
                'Debug this unhandled promise rejection in the worker queue.',
                'Investigate why database connection pool timeouts occur under load.',
                'Fix the hydration mismatch error in Next.js.',
            ],
        },
    },
    {
        name: 'file_operations',
        displayName: 'File & Document Operations',
        description: 'Read, parse, structure, transform, and manage workspace files and document formats',
        category: 'technical',
        icon: '📁',
        tags: ['files', 'parsing', 'conversion', 'data-transformation'],
        isBuiltIn: true,
        schema: {
            purpose: 'Perform robust file operations, parsing, format transformations (JSON/CSV/Markdown/PDF), and directory organization.',
            workflow: [
                {
                    step: 1,
                    title: 'Path & Format Verification',
                    description: 'Validate file paths, encodings, MIME types, and read permissions before processing.',
                },
                {
                    step: 2,
                    title: 'Transformation / Extraction',
                    description: 'Execute lossless or structured data extraction, schema conversion, or sanitization.',
                },
                {
                    step: 3,
                    title: 'Safe Output & Integrity Check',
                    description: 'Write results safely, preventing unintended file overwrites without explicit user confirmation.',
                },
            ],
            safetyAndSideEffects: 'Always require confirmation before overwriting or deleting existing files.',
            outputTemplate: `### 📁 File Operation Result

- **Target Path:** \`[file/path]\`
- **Operation:** [Parsed / Converted / Generated]
- **Status:** [Success / Partial / Gaps Identified]

#### 📊 Summary of Content / Data Extracted:
[Key points / schema breakdown]`,
            triggerExamples: [
                'Convert uploaded CSV records into structured JSON.',
                'Extract text and tables from this document.',
                'List all configuration files in this directory.',
            ],
        },
    },

    // ==========================================
    // === AUTOMATION & RESEARCH SKILLS ===
    // ==========================================
    {
        name: 'browser_automation',
        displayName: 'Browser Automation & Scraping',
        description: 'Navigate web applications, extract structured DOM data, and automate browser-driven workflows',
        category: 'automation',
        icon: '🌐',
        tags: ['scraping', 'automation', 'browser', 'data-extraction'],
        isBuiltIn: true,
        schema: {
            purpose: 'Automate website interactions, crawl target URLs, and extract structured data while handling dynamic content.',
            workflow: [
                {
                    step: 1,
                    title: 'Target Discovery & Navigation',
                    description: 'Formulate target URL, determine required selectors, handle waits for dynamic client rendering.',
                },
                {
                    step: 2,
                    title: 'DOM Extraction & Cleaning',
                    description: 'Extract text, links, metadata, and structured fields, removing ad boilerplate and navigation noise.',
                },
                {
                    step: 3,
                    title: 'Structured Output Synthesis',
                    description: 'Format scraped contents into clean JSON, tables, or markdown dossiers.',
                },
            ],
            safetyAndSideEffects: 'Respect robots.txt and rate limits. Do not execute destructive actions on external authenticated sessions without consent.',
            outputTemplate: `### 🌐 Web Extraction Summary

- **Source URL:** [URL]
- **Timestamp:** [Timestamp]
- **Items Extracted:** [Count]

#### 📋 Extracted Data:
| Key / Field | Extracted Content |
|---|---|
| ... | ... |`,
            triggerExamples: [
                'Scrape the documentation page and extract the API endpoint list.',
                'Crawl the competitor pricing page and summarize pricing tiers.',
                'Extract article text and author metadata from this URL.',
            ],
        },
    },
    {
        name: 'web_research_synthesis',
        displayName: 'Research & Knowledge Synthesis',
        description: 'Conduct deep-dive research across web sources, synthesize complex topics, and produce actionable briefings',
        category: 'automation',
        icon: '🔬',
        tags: ['research', 'synthesis', 'competitive-analysis', 'market-intelligence'],
        isBuiltIn: true,
        schema: {
            purpose: 'Gather, triangulate, and synthesize multi-source information into executive-ready research summaries with verified citations.',
            workflow: [
                {
                    step: 1,
                    title: 'Search Strategy & Query Framing',
                    description: 'Decompose research questions into targeted search vectors, queries, and authoritative domains.',
                },
                {
                    step: 2,
                    title: 'Source Verification & Fact Checking',
                    description: 'Evaluate source credibility, cross-reference statistics, and identify conflicting claims or data gaps.',
                },
                {
                    step: 3,
                    title: 'Synthesis & Executive Briefing',
                    description: 'Synthesize findings into strategic takeaways, structured comparison matrices, and citations.',
                },
            ],
            safetyAndSideEffects: 'Explicitly mark unverified claims, outdated data, or speculative assertions. Attribute all key statistics.',
            outputTemplate: `## 🔬 Research Brief: [Topic]

### 📌 Executive Summary
[High-level takeaway in 2-3 sentences]

### 📊 Comparative Analysis & Key Findings
- **[Finding 1]:** [Details with citation [1]]
- **[Finding 2]:** [Details with citation [2]]

### ⚖️ Tradeoffs & Landscape Overview
| Aspect / Option | Advantages | Disadvantages | Market Consensus |
|---|---|---|---|
| ... | ... | ... | ... |

### 📚 References & Sources
1. [Source 1 Title](URL) - *[Published Date / Author]*
2. [Source 2 Title](URL) - *[Published Date / Author]*`,
            triggerExamples: [
                'Research the top 5 vector databases and compare latency, pricing, and scalability.',
                'Synthesize the latest industry standards for OAuth 2.1 authentication.',
                'Conduct a competitive landscape analysis on AI workflow orchestration tools.',
            ],
        },
    },
    {
        name: 'data_analysis_reporting',
        displayName: 'Data Analysis & Insights',
        description: 'Process numerical data, compute statistics, identify trends, and generate executive summaries',
        category: 'automation',
        icon: '📊',
        tags: ['analytics', 'metrics', 'reporting', 'kpi'],
        isBuiltIn: true,
        schema: {
            purpose: 'Transform raw data into meaningful business metrics, trend analyses, and actionable recommendations.',
            workflow: [
                {
                    step: 1,
                    title: 'Data Ingestion & Cleaning',
                    description: 'Parse data series, detect outliers, handle missing entries, and verify data schema integrity.',
                },
                {
                    step: 2,
                    title: 'Statistical Computation & Trend Detection',
                    description: 'Compute growth rates, averages, medians, variances, conversion funnels, and cohort behaviors.',
                },
                {
                    step: 3,
                    title: 'Insights & Recommendations',
                    description: 'Translate statistical trends into commercial or technical insights with clear next steps.',
                },
            ],
            safetyAndSideEffects: 'Highlight sample size limitations, data biases, or missing temporal baselines.',
            outputTemplate: `### 📈 Data & Metrics Analysis: [Subject]

#### 🔑 Key Performance Indicators:
- **[Metric 1]:** [Value] (*[Change YoY/MoM]*)
- **[Metric 2]:** [Value] (*[Change YoY/MoM]*)

#### 🔍 Observations & Trend Breakdown:
1. ...
2. ...

#### 💡 Strategic Recommendations:
- **[Actionable Step 1]:** ...
- **[Actionable Step 2]:** ...`,
            triggerExamples: [
                'Analyze user churn data and identify the biggest drop-off stages.',
                'Summarize monthly API latency metrics and flag abnormal spikes.',
                'Calculate revenue growth rates across product tiers from this table.',
            ],
        },
    },
    {
        name: 'api_integration',
        displayName: 'API Integration & Webhooks',
        description: 'Design, connect, and troubleshoot REST, GraphQL, and SaaS webhook integrations',
        category: 'automation',
        icon: '🔌',
        tags: ['api', 'webhooks', 'integrations', 'saas', 'rest'],
        isBuiltIn: true,
        schema: {
            purpose: 'Interface with external APIs, construct structured payloads, handle OAuth/API tokens, and parse responses.',
            workflow: [
                {
                    step: 1,
                    title: 'Endpoint & Schema Specification',
                    description: 'Inspect API contract, authentication schemes, rate limits, headers, and query parameters.',
                },
                {
                    step: 2,
                    title: 'Payload Formulation & Validation',
                    description: 'Construct type-safe JSON payloads with proper validation and idempotency keys.',
                },
                {
                    step: 3,
                    title: 'Response Handling & Error Routing',
                    description: 'Process response payloads, status codes (2xx, 4xx, 5xx), retry policies, and backoff timing.',
                },
            ],
            safetyAndSideEffects: 'Never expose API secrets or private tokens in plain text. Always sanitize outgoing payloads.',
            outputTemplate: `### 🔌 API Integration Specification

- **Endpoint:** \`[METHOD] https://api.service.com/v1/...\`
- **Auth Scheme:** [Bearer Token / API Key / OAuth2]

#### 📦 Request Payload:
\`\`\`json
{
  "key": "value"
}
\`\`\`

#### 📥 Expected Response (200 OK):
\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\``,
            triggerExamples: [
                'Generate a Stripe webhook handler for customer subscription updates.',
                'Construct the payload schema for creating a GitHub issue via REST API.',
                'Design an integration flow between Slack and our incident management service.',
            ],
        },
    },

    // ==========================================
    // === BUSINESS & MANAGEMENT SKILLS ===
    // ==========================================
    {
        name: 'task_management',
        displayName: 'Task Triage & Standardization',
        description: 'Standardize task titles, structure descriptions, prioritize backlogs, and apply rigorous completion criteria',
        category: 'business',
        icon: '✅',
        tags: ['tasks', 'triage', 'prioritization', 'agile', 'standardization'],
        isBuiltIn: true,
        schema: {
            purpose: 'Turn vague, inconsistent, or rough tasks into clear, actionable work units with evidence-backed priorities and templates.',
            workflow: [
                {
                    step: 1,
                    title: 'Confirm Task Context',
                    description: 'Read the task title, description, status, assignee, due date, list, custom fields, comments, and subtasks. Preserve confirmed facts and flag gaps.',
                },
                {
                    step: 2,
                    title: 'Standardize the Title',
                    description: 'Use [Action] + [deliverable] + [context]. Start with specific verbs (Define, Fix, Review, Draft, Ship, Test, Set up). For bugs: Fix [symptom] in [area]. For decisions: Decide [choice] for [context].',
                },
                {
                    step: 3,
                    title: 'Set Priority with Rationale',
                    description: 'Apply highest evidence-supported priority: Urgent (immediate incident/hard deadline), High (major impact/near deadline), Normal (standard planned work), Low (deferrable).',
                },
                {
                    step: 4,
                    title: 'Add / Improve Summary Field',
                    description: 'Write 1-2 sentences covering the purpose, expected result, and primary constraint using confirmed information only.',
                },
                {
                    step: 5,
                    title: 'Apply the Reusable Task Template',
                    description: 'When structure is missing, populate:\n- Outcome: What will be true when complete?\n- Scope: What is in vs out of scope?\n- Next action: Smallest concrete next step\n- Dependencies: People, systems, or inputs needed\n- Done criteria: Observable validation/handoff condition.',
                },
                {
                    step: 6,
                    title: 'Report Result & Flag Open Gaps',
                    description: 'Display original vs proposed state with rationales and highlighted uncertainties.',
                },
            ],
            safetyAndSideEffects: 'Default to a draft for multiple tasks or whenever the user specifies "draft" or "test". Do not alter live tasks until explicitly approved.',
            outputTemplate: `Task: [linked task name]

Title: [original] → [proposed]

Priority: [keep / change to Urgent, High, Normal, or Low] with one-line rationale.

Summary: [proposed summary]

Reusable structure:
- **Outcome:** [What will be true when this is complete?]
- **Scope:** [What is included, and what is explicitly out of scope?]
- **Next action:** [The smallest concrete next step]
- **Dependencies:** [People, decisions, systems, or inputs needed]
- **Done criteria:** [Observable completion and validation condition]

Open gaps: [unknowns that need confirmation]`,
            triggerExamples: [
                'Clean up this task.',
                'Triage these rough backlog tasks.',
                'Standardize the titles and priorities.',
                'Add summaries and use the task template.',
                'Test the cleanup skill on these tasks.',
            ],
        },
    },
    {
        name: 'project_planning_scoping',
        displayName: 'Project Scoping & Roadmap Planning',
        description: 'Break down complex initiatives into milestones, work packages, dependency graphs, and resource estimates',
        category: 'business',
        icon: '🗺️',
        tags: ['project-management', 'roadmaps', 'scoping', 'milestones', 'estimation'],
        isBuiltIn: true,
        schema: {
            purpose: 'Transform high-level product goals into phased project plans with clear milestones, risks, and deliverable ownership.',
            workflow: [
                {
                    step: 1,
                    title: 'Scope Definition & Success Metrics',
                    description: 'Clarify project goals, non-goals, key stakeholders, delivery timelines, and measurable success criteria.',
                },
                {
                    step: 2,
                    title: 'Work Breakdown Structure (WBS)',
                    description: 'Decompose initiatives into phased milestones and deliverable work packages.',
                },
                {
                    step: 3,
                    title: 'Dependency & Critical Path Mapping',
                    description: 'Identify blocking cross-team dependencies, technical prerequisites, and critical path items.',
                },
                {
                    step: 4,
                    title: 'Risk Assessment & Mitigation Matrix',
                    description: 'Map potential risks (technical, resource, timing) with mitigation strategies.',
                },
            ],
            safetyAndSideEffects: 'Ensure estimates account for buffer and dependency lag. Flag unconfirmed resource allocations.',
            outputTemplate: `## 🗺️ Project Execution Plan: [Project Name]

### 🎯 Objective & Success Metrics:
- **Goal:** [Primary Objective]
- **Target Completion:** [Date/Sprint]
- **Key Metric:** [Measurable KPI]

---
### 📅 Phased Milestones & Deliverables:
#### Phase 1: [Milestone Name] (Target: [Date])
- [ ] **Deliverable 1.1:** [Description] *(Owner: [Role])*
- [ ] **Deliverable 1.2:** [Description] *(Owner: [Role])*

#### Phase 2: [Milestone Name] (Target: [Date])
- [ ] **Deliverable 2.1:** [Description] *(Owner: [Role])*

---
### ⚠️ Key Risks & Mitigations:
| Risk Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|
| ... | High | Med | ... |`,
            triggerExamples: [
                'Create a project roadmap for migrating our auth system.',
                'Break down the MVP launch plan into 3 sprints.',
                'Scope the requirements and milestones for the billing portal revamp.',
            ],
        },
    },
    {
        name: 'meeting_notes_action_items',
        displayName: 'Meeting Synthesis & Action Tracking',
        description: 'Distill transcripts into executive summaries, key decisions, ownership assignments, and follow-ups',
        category: 'business',
        icon: '📝',
        tags: ['meetings', 'action-items', 'summarization', 'decisions'],
        isBuiltIn: true,
        schema: {
            purpose: 'Convert raw meeting notes or conversation transcripts into clear decisions, key takeaways, and assigned action items.',
            workflow: [
                {
                    step: 1,
                    title: 'Context & Participant Identification',
                    description: 'Record meeting topic, date, attendees, and stated agenda.',
                },
                {
                    step: 2,
                    title: 'Key Decisions & Consensus Extraction',
                    description: 'Capture explicit decisions made, agreements reached, and items deferred.',
                },
                {
                    step: 3,
                    title: 'Action Item Extraction with Ownership',
                    description: 'Format action items with [Assignee], [Action Verb], [Deliverable], and [Due Date/Timeframe].',
                },
            ],
            safetyAndSideEffects: 'Do not invent assignees or commitments not explicitly stated in the conversation.',
            outputTemplate: `### 📋 Meeting Summary: [Topic]
**Date:** [Date] | **Attendees:** [List of participants]

---
#### 💡 Key Takeaways:
- ...
- ...

#### ⚖️ Decisions Made:
1. **[Decision 1]:** [Context & Rationale]
2. **[Decision 2]:** [Context & Rationale]

#### ✅ Action Items & Ownership:
- [ ] **@[Assignee]**: [Action item description] *(Due: [Date/Next Sync])*
- [ ] **@[Assignee]**: [Action item description] *(Due: [Date/Next Sync])*`,
            triggerExamples: [
                'Summarize these meeting notes and extract action items.',
                'What decisions were made in this sprint planning transcript?',
                'Generate a follow-up email with assigned tasks from this sync.',
            ],
        },
    },
    {
        name: 'customer_support_triage',
        displayName: 'Customer Support & Ticket Triage',
        description: 'Triage customer inquiries, categorize issues, formulate empathetic responses, and guide escalations',
        category: 'business',
        icon: '🎧',
        tags: ['support', 'customer-service', 'triage', 'ticketing'],
        isBuiltIn: true,
        schema: {
            purpose: 'Provide rapid, empathetic, and accurate resolution to customer inquiries while routing complex issues effectively.',
            workflow: [
                {
                    step: 1,
                    title: 'Issue Categorization & Sentiment Assessment',
                    description: 'Identify issue type (Billing, Bug, Feature Request, How-To), customer tier, urgency, and emotional tone.',
                },
                {
                    step: 2,
                    title: 'Knowledge Base & Policy Verification',
                    description: 'Match customer inquiry against documented product behavior, SLAs, and troubleshooting steps.',
                },
                {
                    step: 3,
                    title: 'Empathetic & Solution-Oriented Response',
                    description: 'Draft clear, helpful responses with step-by-step guidance, avoiding confusing jargon.',
                },
                {
                    step: 4,
                    title: 'Escalation Tagging',
                    description: 'If unresolved or high-severity, summarize ticket context for engineering/support escalations.',
                },
            ],
            safetyAndSideEffects: 'Never make unauthorized refund commitments or disclose internal technical details/customer data.',
            outputTemplate: `### 🎧 Customer Support Triage

**Category:** [Billing / Technical Bug / Account / Feature Request]  
**Priority:** [Urgent / High / Normal / Low]  
**Sentiment:** [Frustrated / Neutral / Positive]  

---
#### 💬 Proposed Response:
> Dear [Customer Name],
>
> [Empathetic acknowledgment of the issue].
>
> [Clear, step-by-step resolution / explanation].
>
> [Next step / invitation for follow-up].
>
> Best regards,  
> [Support Team]

---
#### 🚩 Escalation Notes (if needed):
- **Internal Summary:** [Concise technical summary of the problem]
- **Action Required by Team:** [Engineering / Finance / Product]`,
            triggerExamples: [
                'Triage this angry customer support email about a failed payment.',
                'Draft a response explaining how to configure custom webhooks.',
                'Categorize these 10 customer feedback tickets and identify common themes.',
            ],
        },
    },
];
