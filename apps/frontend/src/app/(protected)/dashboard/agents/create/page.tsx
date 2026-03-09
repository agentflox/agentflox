"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Shell from "@/components/layout/Shell";
import { ChatComposer } from '@/entities/chats/components/ChatComposer';
import { AgentSuggestionCard, type AgentSuggestionCardProps } from '@/entities/agents/components/AgentSuggestionCard';
import { AgentTemplateCard, type AgentTemplateCardProps } from '@/entities/agents/components/AgentTemplateCard';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from 'lucide-react';

type AgentTemplate = Omit<AgentTemplateCardProps, 'onClick' | 'disabled'>;

const SUGGESTED_AGENTS: Omit<AgentSuggestionCardProps, 'onClick' | 'disabled'>[] = [
  {
    id: 'blog-creator',
    title: 'Blog Creator',
    description: 'Generates engaging blog posts and content',
    icon: '✍️',
    gradient: 'from-blue-500 to-purple-600',
    message: 'Blog Creator',
  },
  {
    id: 'project-manager',
    title: 'Project Manager',
    description: 'Tracks progress and manages project workflows',
    icon: '📊',
    gradient: 'from-green-500 to-teal-600',
    message: 'Project Management',
  },
  {
    id: 'task-triage',
    title: 'Task Triage',
    description: 'Categorizes and prioritizes new tasks',
    icon: '🎯',
    gradient: 'from-orange-500 to-red-600',
    message: 'Task Triage',
  },
  {
    id: 'content-outliner',
    title: 'Content Outliner',
    description: 'Structures blog content and outlines',
    icon: '📝',
    gradient: 'from-pink-500 to-rose-600',
    message: 'Content Outliner',
  },
];

const AGENT_TEMPLATES: AgentTemplate[] = [
  // Project Management
  {
    id: 'project-reporter',
    title: 'Project Reporter',
    description: 'Summarizes task progress and project status',
    icon: '📈',
    category: 'Project Management',
    message: 'Project Reporter',
  },
  {
    id: 'standup-manager',
    title: 'StandUp Manager',
    description: 'Collects and shares team updates',
    icon: '👥',
    category: 'Project Management',
    message: 'StandUp Manager',
  },
  {
    id: 'priorities-manager',
    title: 'Priorities Manager',
    description: 'Manages priorities and escalates urgent tasks',
    icon: '⚡',
    category: 'Project Management',
    message: 'Priorities Manager',
  },
  {
    id: 'status-reporter',
    title: 'Status Reporter',
    description: 'Auto-generates progress summaries and flags blockers',
    icon: '📊',
    category: 'Project Management',
    message: 'Status Reporter',
  },
  // Teams
  {
    id: 'standup-runner',
    title: 'StandUp Runner',
    description: 'Collects async updates and summarizes blockers',
    icon: '🏃',
    category: 'Teams',
    message: 'StandUp Runner',
  },
  {
    id: 'one-on-one-manager',
    title: '1:1 Management',
    description: 'Preps for one-on-ones with talking points',
    icon: '💬',
    category: 'Teams',
    message: '1:1 Management',
  },
  {
    id: 'activity-updates',
    title: 'Activity Updates',
    description: 'Automated summaries of team activity and progress',
    icon: '📢',
    category: 'Teams',
    message: 'Activity Updates',
  },
  {
    id: 'retro-facilitator',
    title: 'Retro Facilitator',
    description: 'Gathers feedback on what went well or wrong',
    icon: '🔄',
    category: 'Teams',
    message: 'Retro Facilitator',
  },
  // Design
  {
    id: 'social-media-images',
    title: 'Social Media Images',
    description: 'Generates on-brand graphics for any platform',
    icon: '🎨',
    category: 'Design',
    message: 'Social Media Images',
  },
];

export default function AgentCreatePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createAgentMutation = trpc.agent.create.useMutation();
  const initializeBuilderMutation = trpc.agent.builder.initialize.useMutation();
  const messageMutation = trpc.agent.builder.message.useMutation();

  const handleCardClick = async (card: Omit<AgentSuggestionCardProps | AgentTemplateCardProps, 'onClick' | 'disabled'>) => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      // Step 1: Create a new agent
      const agent = await createAgentMutation.mutateAsync({
        name: card.title,
        description: card.description,
        agentType: "TASK_EXECUTOR",
        status: "DRAFT",
        systemPrompt: "",
      });

      // Step 2: Initialize builder conversation
      const builderData = await initializeBuilderMutation.mutateAsync({
        agentId: agent.id,
        skipWelcome: true,  // Skip the welcome message
      });

      // Step 3: Send the first message
      await messageMutation.mutateAsync({
        conversationId: builderData.conversationId,
        message: card.message,
        agentId: agent.id,
      });

      // Step 4: Redirect to the agent builder page
      router.push(`/dashboard/agents/create/${agent.id}`);
    } catch (error) {
      console.error('Failed to create agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create agent');
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (
    messageText: string,
    options?: { attachments?: any[]; webSearch?: boolean; contexts?: Array<{ type: string; id: string }> }
  ) => {
    if (!messageText.trim() || isCreating) return;

    setIsCreating(true);

    try {
      // Step 1: Create a new agent
      const agent = await createAgentMutation.mutateAsync({
        name: "New Agent",
        description: "",
        agentType: "TASK_EXECUTOR",
        status: "DRAFT",
        systemPrompt: "",
      });

      // Step 2: Initialize builder conversation
      const builderData = await initializeBuilderMutation.mutateAsync({
        agentId: agent.id,
        skipWelcome: true,  // Skip the welcome message
      });

      // Step 3: Send the user's message
      await messageMutation.mutateAsync({
        conversationId: builderData.conversationId,
        message: messageText,
        agentId: agent.id,
      });

      // Step 4: Redirect to the agent builder page
      router.push(`/dashboard/agents/create/${agent.id}`);
    } catch (error) {
      console.error('Failed to create agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create agent');
      setIsCreating(false);
    }
  };

  const handleGetStarted = async () => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      // Create a new agent - conversation and message initialization will be handled by AgentChatBuilder
      const agent = await createAgentMutation.mutateAsync({
        name: "New Agent",
        description: "",
        agentType: "TASK_EXECUTOR",
        status: "DRAFT",
        systemPrompt: "",
      });

      // Redirect to the agent builder page - AgentChatBuilder will handle conversation initialization
      router.push(`/dashboard/agents/create/${agent.id}`);
    } catch (error) {
      console.error('Failed to create agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create agent');
      setIsCreating(false);
    }
  };

  // Group templates by category
  const templatesByCategory = AGENT_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, AgentTemplate[]>);

  return (
    <Shell>
      <div className="flex flex-col max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create AI Agent</h1>
              <p className="text-muted-foreground mt-1">
                What should your new teammate work with you on?
              </p>
            </div>
          </div>
        </div>

        {/* Chat Composer */}
        <div className="mb-12">
          <Card className="border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <ChatComposer
                onSend={handleSendMessage}
                isSending={isCreating}
                disabled={isCreating}
                inputClassName="min-h-[100px]"
              />
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {SUGGESTED_AGENTS.map((agent) => (
                  <AgentSuggestionCard
                    key={agent.id}
                    {...agent}
                    onClick={() => handleCardClick(agent)}
                    disabled={isCreating}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Templates by Category */}
        {Object.entries(templatesByCategory).map(([category, templates]) => (
          <div key={category} className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{category}</h2>
                <p className="text-sm text-muted-foreground">Specialized agents for {category.toLowerCase()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <AgentTemplateCard
                  key={template.id}
                  {...template}
                  onClick={() => handleCardClick(template)}
                  disabled={isCreating}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Get Started Section */}
        <div className="mb-16 mt-20">
          <Card className="border-2 border-dashed border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Didn't find what you were looking for?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Describe your perfect Super Agent to our agent builder to get started
              </p>
              <Button
                onClick={handleGetStarted}
                disabled={isCreating}
                size="lg"
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
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


        {/* Animated Loading Overlay */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop Blur & Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md mx-4"
            >
              {/* Outer Glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30 blur-xl animate-pulse" />

              <Card className="relative overflow-hidden border-0 shadow-2xl bg-card">
                {/* Embedded Progress Line */}
                <CardContent className="p-8 pb-10">
                  <div className="flex flex-col items-center gap-6">
                    {/* Futuristic Spinner */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      {/* Outer spinning ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Inner spinning ring (opposite) */}
                      <motion.div
                        className="absolute inset-2 rounded-full border-2 border-transparent border-b-pink-500 border-l-purple-500"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Center pulsing icon */}
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full"
                      >
                        <Sparkles className="w-6 h-6 text-purple-500" />
                      </motion.div>
                    </div>

                    <div className="text-center space-y-2">
                      <motion.h3
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                      >
                        Initializing Agent
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm text-muted-foreground"
                      >
                        Setting up the foundational architecture...
                      </motion.p>

                      {/* Bouncing Dots */}
                      <div className="flex items-center justify-center gap-1.5 mt-4">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-purple-500/50"
                            animate={{ y: ["0%", "-50%", "0%"] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </Shell>
  );
}

