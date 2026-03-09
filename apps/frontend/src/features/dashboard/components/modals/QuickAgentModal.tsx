"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Search, Bot, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface QuickAgentPopoverProps {
    contextId?: string;
    contextType?: 'SPACE' | 'PROJECT' | 'TEAM';
    onOpenChange?: (open: boolean) => void;
}

const SUGGESTED_AGENTS = [
    { title: 'Blog Creator', description: 'Generates engaging blog posts and content', icon: '✍️', gradient: 'from-blue-500 to-purple-600', message: 'Blog Creator', category: 'Content' },
    { title: 'Project Manager', description: 'Tracks progress and workflows', icon: '📊', gradient: 'from-green-500 to-teal-600', message: 'Project Management', category: 'Management' },
    { title: 'Task Triage', description: 'Categorizes and prioritizes new tasks', icon: '🎯', gradient: 'from-orange-500 to-red-600', message: 'Task Triage', category: 'Productivity' },
    { title: 'Code Reviewer', description: 'Reviews code for best practices', icon: '💻', gradient: 'from-blue-600 to-cyan-500', message: 'Code Review', category: 'Engineering' },
];

export function QuickAgentPopover({ contextId, contextType, onOpenChange }: QuickAgentPopoverProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const createAgentMutation = trpc.agent.create.useMutation();
    const initializeBuilderMutation = trpc.agent.builder.initialize.useMutation();
    const messageMutation = trpc.agent.builder.message.useMutation();

    const handleCreate = async (agentData: any) => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            const agent = await createAgentMutation.mutateAsync({
                name: agentData.title,
                description: agentData.description,
                agentType: "TASK_EXECUTOR",
                systemPrompt: `You are a helpful AI agent specialized in ${agentData.title.toLowerCase()}.`,
                status: "DRAFT",
                metadata: contextId ? { contextId, contextType } : undefined
            });

            const builderData = await initializeBuilderMutation.mutateAsync({ agentId: agent.id, skipWelcome: true });
            await messageMutation.mutateAsync({
                conversationId: builderData.conversationId,
                message: agentData.message || agentData.title,
                agentId: agent.id,
            });

            if (onOpenChange) onOpenChange(false);
            router.push(`/dashboard/agents/create/${agent.id}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to create agent');
            setIsCreating(false);
        }
    };

    const filteredAgents = SUGGESTED_AGENTS.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="relative w-[450px] flex flex-col max-h-[600px] bg-white text-zinc-950 rounded-lg shadow-lg">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-lg">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-zinc-900">AI Agents</h3>
                        <p className="text-xs text-zinc-500">Create a new intelligent teammate</p>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search agents..."
                        className="pl-9 h-9 bg-white border-zinc-200 text-sm focus-visible:ring-indigo-500/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3">
                    {filteredAgents.length > 0 ? (
                        <>
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 px-1">Suggested</h4>
                            <div className="grid grid-cols-1 gap-1.5 mb-3">
                                {filteredAgents.map((agent) => (
                                    <button
                                        key={agent.title}
                                        onClick={() => handleCreate(agent)}
                                        disabled={isCreating}
                                        className="group flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-all text-left border border-transparent hover:border-zinc-100 disabled:opacity-50 w-full"
                                    >
                                        <div className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform`}>
                                            {agent.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="font-medium text-sm text-zinc-900">{agent.title}</span>
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-zinc-100 text-zinc-500 group-hover:bg-white">{agent.category}</Badge>
                                            </div>
                                            <p className="text-xs text-zinc-500 line-clamp-1">{agent.description}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all self-center" />
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                                <Search className="h-5 w-5 text-zinc-400" />
                            </div>
                            <p className="text-sm font-medium text-zinc-900 mb-1">No agents found</p>
                            <p className="text-xs text-zinc-500 text-center">Try a different search term or create a custom agent</p>
                        </div>
                    )}

                    <Separator className="my-3 bg-zinc-100" />

                    <button
                        onClick={() => handleCreate({ title: 'New Agent', description: 'Custom agent', message: 'Hello' })}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-dashed border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group text-left"
                        disabled={isCreating}
                    >
                        <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm text-zinc-900 group-hover:text-indigo-700">Create from scratch</h4>
                            <p className="text-xs text-zinc-500">Design a custom agent with specific skills</p>
                        </div>
                    </button>
                </div>
            </ScrollArea>

            {isCreating && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <p className="text-sm font-medium text-zinc-600">Creating agent...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export as both named and default for compatibility if needed, but here sticking to named export as preferred
export { QuickAgentPopover as QuickAgentModal }; 
