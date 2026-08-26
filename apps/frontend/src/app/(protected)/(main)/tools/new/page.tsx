"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from "@/components/layout/Shell";
import { ChatComposer } from '@/entities/chats/components/ChatComposer';
import { ToolSuggestionCard, type ToolSuggestionCardProps } from '@/entities/tools/components/ToolSuggestionCard';
import { ToolTemplateCard, type ToolTemplateCardProps } from '@/entities/tools/components/ToolTemplateCard';
import ToolInitModal from '@/entities/tools/components/Toolinitmodal';
import { trpc } from '@/lib/trpc';
import { toolService } from '@/services/tool.service';
import { toast } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, HelpCircle, LayoutGrid, Wrench } from 'lucide-react';
import { ChatContextModal, type ContextEntity } from '@/features/dashboard/components/modals/ChatContextModal';

type ToolTemplate = Omit<ToolTemplateCardProps, 'onClick' | 'disabled'>;

async function getResponseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { error?: string; message?: string; userMessage?: string };
    return body.error || body.userMessage || body.message || text || `Request failed (${res.status})`;
  } catch {
    return text || `Request failed (${res.status})`;
  }
}

const SUGGESTED_TOOLS: Omit<ToolSuggestionCardProps, 'onClick' | 'disabled'>[] = [
  {
    id: 'web-scraper',
    title: 'Web Scraper & Parser',
    description: 'Extracts structured content, articles, and tables from web pages',
    icon: '🌐',
    gradient: 'from-blue-500 to-indigo-600',
    message: 'Build a web scraper and HTML parser tool that extracts structured content and tables from any URL',
  },
  {
    id: 'api-connector',
    title: 'REST API Connector',
    description: 'Executes authenticated HTTP requests and parses JSON responses',
    icon: '⚡',
    gradient: 'from-amber-500 to-orange-600',
    message: 'Create a REST API connector tool that sends HTTP requests with authentication and transforms JSON responses',
  },
  {
    id: 'document-parser',
    title: 'Document & File Parser',
    description: 'Processes PDFs, CSVs, and spreadsheets to extract key fields',
    icon: '📄',
    gradient: 'from-emerald-500 to-teal-600',
    message: 'Create a document parsing and summary tool that reads file content and extracts key structured data',
  },
  {
    id: 'webhook-notifier',
    title: 'Webhook & Notifier',
    description: 'Sends real-time payloads to external endpoints and webhooks',
    icon: '🔔',
    gradient: 'from-purple-500 to-pink-600',
    message: 'Build a notification dispatcher tool that sends formatted messages and payloads to webhooks',
  },
];

const TOOL_TEMPLATES: ToolTemplate[] = [
  // Data & APIs
  {
    id: 'rest-api-fetcher',
    title: 'REST API Fetcher',
    description: 'Queries external endpoints with customizable headers and body',
    icon: '🌐',
    category: 'Data & APIs',
    message: 'Build a REST API query tool with parameter mapping and error handling',
  },
  {
    id: 'json-schema-validator',
    title: 'JSON Schema Validator',
    description: 'Validates structured inputs and objects against JSON schema rules',
    icon: '📐',
    category: 'Data & APIs',
    message: 'Build a JSON schema validation tool that verifies input data structures',
  },
  {
    id: 'sql-query-runner',
    title: 'SQL Query Runner',
    description: 'Executes parameterized database queries and formats record sets',
    icon: '💾',
    category: 'Data & APIs',
    message: 'Build a safe SQL query runner tool that takes parameters and returns clean JSON results',
  },
  {
    id: 'graphql-client',
    title: 'GraphQL Client',
    description: 'Performs queries and mutations against GraphQL API endpoints',
    icon: '🔮',
    category: 'Data & APIs',
    message: 'Build a GraphQL query and mutation client tool with authentication',
  },

  // Utilities & Formatting
  {
    id: 'text-cleaner',
    title: 'Text Sanitizer & Cleaner',
    description: 'Strips HTML, trims whitespace, and formats text structures',
    icon: '🧹',
    category: 'Utilities & Formatting',
    message: 'Build a text cleanup tool that strips HTML, normalizes whitespace, and formats text',
  },
  {
    id: 'regex-extractor',
    title: 'Regex Pattern Extractor',
    description: 'Extracts emails, URLs, dates, and custom tokens via regex',
    icon: '🔍',
    category: 'Utilities & Formatting',
    message: 'Build a regex entity extractor tool for emails, URLs, dates, and custom patterns',
  },
  {
    id: 'datetime-calculator',
    title: 'Date & Timezone Calculator',
    description: 'Calculates timestamps, business day offsets, and timezones',
    icon: '📅',
    category: 'Utilities & Formatting',
    message: 'Build a date and timezone utility tool that calculates durations and reformats timestamps',
  },
  {
    id: 'unit-converter',
    title: 'Currency & Unit Converter',
    description: 'Converts metric units, dimensions, and financial exchange rates',
    icon: '💱',
    category: 'Utilities & Formatting',
    message: 'Build a currency and measurement unit conversion tool with precise math',
  },

  // Web & Communication
  {
    id: 'html-to-markdown',
    title: 'HTML to Markdown',
    description: 'Converts raw HTML pages into readable markdown documents',
    icon: '📝',
    category: 'Web & Communication',
    message: 'Build an HTML to Markdown converter tool that extracts main article content',
  },
  {
    id: 'email-dispatcher',
    title: 'Email Dispatcher',
    description: 'Generates and sends formatted transactional emails',
    icon: '✉️',
    category: 'Web & Communication',
    message: 'Build an email sender tool that sends formatted HTML and plain text emails',
  },
  {
    id: 'slack-notifier',
    title: 'Slack & Discord Notifier',
    description: 'Formats rich embed cards and pushes messages to channels',
    icon: '💬',
    category: 'Web & Communication',
    message: 'Build a webhook notification tool for Slack and Discord with rich cards',
  },
  {
    id: 'seo-meta-inspector',
    title: 'SEO Meta Inspector',
    description: 'Extracts and evaluates open graph tags and SEO metadata',
    icon: '🏷️',
    category: 'Web & Communication',
    message: 'Build an SEO metadata extractor tool that inspects content and returns optimal meta tags',
  },
];

export default function ToolCreatePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<ContextEntity[]>([]);

  const createToolMutation = trpc.compositeTool.create.useMutation();

  // Fetch active workspace for the context modal
  const { data: workspaces } = trpc.workspace.list.useQuery({});
  const workspaceId = workspaces?.[0]?.id ?? '';

  const handleCardClick = async (card: Omit<ToolSuggestionCardProps | ToolTemplateCardProps, 'onClick' | 'disabled'>) => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      // Step 1: Create a new tool
      const tool = await createToolMutation.mutateAsync({
        name: card.title,
        description: card.description,
        mode: "AI",
        functionSchema: {
          name: card.title.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || "custom_tool",
          description: card.description || "",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
          returns: {
            type: "object",
            properties: {},
          },
        },
        steps: [],
      });

      // Step 2: Initialize builder conversation
      const initRes = await toolService.tools.builder.initialize({
        toolId: tool.id,
        skipWelcome: true,  // Skip the welcome message
      });
      if (!initRes.ok) throw new Error(await getResponseError(initRes));
      const builderData = await initRes.json();

      // Step 3: Send the first message
      const msgRes = await toolService.tools.builder.message({
        conversationId: builderData.conversationId,
        message: card.message,
        toolId: tool.id,
      });
      if (!msgRes.ok) throw new Error(await getResponseError(msgRes));

      // Step 4: Redirect to the tool editor page with assistant open
      router.push(`/tools/${tool.id}?assistant=true`);
    } catch (error) {
      console.error('Failed to create tool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create tool');
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (
    messageText: string,
    options?: { attachments?: any[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }>; mentions?: any[] }
  ) => {
    if (!messageText.trim() || isCreating) return;

    setIsCreating(true);

    try {
      // Step 1: Create a new tool
      const tool = await createToolMutation.mutateAsync({
        name: "New Tool",
        description: "",
        mode: "AI",
        functionSchema: {
          name: "new_tool",
          description: "Custom AI tool",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
          returns: {
            type: "object",
            properties: {},
          },
        },
        steps: [],
      });

      // Step 2: Initialize builder conversation
      const initRes = await toolService.tools.builder.initialize({
        toolId: tool.id,
        skipWelcome: true,  // Skip the welcome message
      });
      if (!initRes.ok) throw new Error(await getResponseError(initRes));
      const builderData = await initRes.json();

      // Step 3: Send the user's message
      const msgRes = await toolService.tools.builder.message({
        conversationId: builderData.conversationId,
        message: messageText,
        toolId: tool.id,
        contexts: options?.contexts,
        mentions: options?.mentions,
        attachments: options?.attachments,
      });
      if (!msgRes.ok) throw new Error(await getResponseError(msgRes));

      // Step 4: Redirect to the tool editor page with assistant open
      router.push(`/tools/${tool.id}?assistant=true`);
    } catch (error) {
      console.error('Failed to create tool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create tool');
      setIsCreating(false);
    }
  };

  const handleGetStarted = async () => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      // Create a new tool - conversation and message initialization will be handled by ToolAIBuilder
      const tool = await createToolMutation.mutateAsync({
        name: "New Tool",
        description: "",
        mode: "AI",
        functionSchema: {
          name: "new_tool",
          description: "Custom AI tool",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
          returns: {
            type: "object",
            properties: {},
          },
        },
        steps: [],
      });

      // Redirect to the tool editor page with assistant open
      router.push(`/tools/${tool.id}?assistant=true`);
    } catch (error) {
      console.error('Failed to create tool:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create tool');
      setIsCreating(false);
    }
  };

  const handleGetHelp = () => {
    window.open('https://docs.agentflox.com/', '_blank', 'noopener,noreferrer');
  };

  // Group templates by category
  const templatesByCategory = TOOL_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ToolTemplate[]>);

  return (
    <Shell>
      <div className="flex flex-col max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/5">
                <Sparkles className="h-8 w-8 text-violet-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Create AI Tool</h1>
                <p className="text-muted-foreground">
                  What kind of tool would you like to build?
                </p>
              </div>
            </div>

            {/* Top-right actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetHelp}
                className="text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4 mr-1.5" />
                Get help
              </Button>
              <Button
                size="sm"
                onClick={handleGetStarted}
                disabled={isCreating}
                className="rounded-md border border-border bg-background text-muted-foreground font-medium hover:bg-muted/50 hover:text-foreground shadow-none"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Start from scratch'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Composer */}
        <div className="mb-16 mt-12 max-w-3xl mx-auto w-full">
          <ChatComposer
            onSend={handleSendMessage}
            isSending={isCreating}
            disabled={isCreating}
            inputClassName="min-h-[80px]"
            hideMentions
            onContextClick={() => setContextModalOpen(true)}
            contextCount={selectedContexts.length}
          />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SUGGESTED_TOOLS.map((tool) => (
              <ToolSuggestionCard
                key={tool.id}
                {...tool}
                onClick={() => handleCardClick(tool)}
                disabled={isCreating}
              />
            ))}
          </div>
        </div>

        {/* ── Divider: Composer → Templates ── */}
        <div className="relative flex items-center gap-5 py-2 mb-12 mt-8">
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/40 shrink-0">
            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              Start from a template
            </span>
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Tool Templates by Category */}
        <div className="mb-16">
          {Object.entries(templatesByCategory).map(([category, templates]) => (
            <div key={category} className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">{category}</h2>
                  <p className="text-sm text-muted-foreground">Pre-configured blueprints for {category.toLowerCase()}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <ToolTemplateCard
                    key={template.id}
                    {...template}
                    onClick={() => handleCardClick(template)}
                    disabled={isCreating}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Get Started Section */}
        <div className="mb-24 mt-16">
          <Card className="border-2 border-dashed border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                Didn't find what you were looking for?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Describe your custom tool to our AI tool builder to get started
              </p>
              <Button
                onClick={handleGetStarted}
                disabled={isCreating}
                size="lg"
                className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <ToolInitModal open={isCreating} />
      </div>

      <ChatContextModal
        workspaceId={workspaceId}
        open={contextModalOpen}
        onOpenChange={setContextModalOpen}
        selectedContexts={selectedContexts}
        onContextsChange={setSelectedContexts}
      />
    </Shell>
  );
}


