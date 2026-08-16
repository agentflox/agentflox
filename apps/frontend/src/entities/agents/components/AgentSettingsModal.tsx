"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import {
    FileText, Sparkles, Zap, Wrench, Brain, X,
    HelpCircle, ExternalLink, Database,
    SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstructionsTab } from "./tabs/InstructionsTab";
import { TriggersTab } from "./tabs/TriggersTab";
import { ToolsTab } from "./tabs/ToolsTab";
import { KnowledgeTab } from "./tabs/KnowledgeTab";
import { MemoryTab } from "./tabs/MemoryTab";
import { AdvancedTab } from "./tabs/AdvancedTab";
import { useMarketplaceGuard } from "@/features/marketplace/hooks/useMarketplaceGuard";
import { MarketplaceGuardDialog } from "@/features/marketplace/components/MarketplaceGuardDialog";
import { PublishEntityModal } from "@/features/marketplace/components/PublishEntityModal";
import { AgentMoreActions } from "@/entities/agents/components/AgentMoreActions";
import { AgentModelShareBar } from "@/entities/agents/components/AgentModelShareBar";
import { AgentIdentityHeader } from "@/entities/agents/components/AgentIdentityHeader";
import {
    AgentSettingsSaveProvider,
    SaveChangesButton,
} from "@/entities/agents/components/AgentSettingsSaveContext";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { setSupportAssistantOpen } from "@/stores/slices/messages.slice";

interface AgentSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent: any;
    onUpdate: () => void;
}

export function AgentSettingsModal({
    open,
    onOpenChange,
    agent,
    onUpdate
}: AgentSettingsModalProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [activeSection, setActiveSection] = useState("instructions");

    // Marketplace Injection
    const { checkProfileAndProceed, isGuardOpen, setIsGuardOpen } = useMarketplaceGuard();
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    const handlePublishClick = () => {
        checkProfileAndProceed(() => {
            setIsPublishModalOpen(true);
        });
    };

    const sidebarItems = [
        { id: 'instructions', label: 'Instructions', description: 'Create guidelines for your agent', icon: FileText },
        { id: 'triggers', label: 'Triggers', description: 'How your agent starts', icon: Zap },
        { id: 'tools', label: 'Tools', description: 'Used by agents to complete tasks', icon: Wrench },
        { id: 'knowledge', label: 'Knowledge', description: 'Add your documents and data', icon: Database },
        { id: 'memory', label: 'Memory', description: 'What the agent remembers', icon: Brain },
        { id: 'advanced', label: 'Advanced', description: 'Fine-tune engine & core', icon: SlidersHorizontal, bottom: true },
        { id: 'help', label: 'Need help?', description: 'Guides & Support', icon: HelpCircle, bottom: true },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="flex flex-col max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[96vh] p-0 overflow-hidden gap-0 border-none shadow-2xl rounded-2xl"
            >
                <VisuallyHidden>
                    <DialogTitle>Agent Settings — {agent.name}</DialogTitle>
                </VisuallyHidden>
                <AgentSettingsSaveProvider
                    activeSection={activeSection}
                    onActiveSectionChange={setActiveSection}
                >
                <div className="flex h-full min-h-0 w-full bg-white dark:bg-zinc-950">

                    {/* Left sidebar — Advanced / Help pinned to bottom */}
                    <div className="w-80 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0 min-h-0 h-full">
                        <div className="h-20 flex items-center px-6 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                            <AgentIdentityHeader agent={agent} onUpdated={onUpdate} className="w-full" />
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
                            <div className="space-y-1.5">
                                {sidebarItems.filter(item => !item.bottom).map((item) => {
                                    const isActive = activeSection === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={cn(
                                                "w-full flex items-start gap-3.5 p-3.5 rounded-xl transition-all text-left relative cursor-pointer",
                                                isActive
                                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200/50 dark:ring-indigo-800/50"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80",
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "h-5 w-5 mt-0.5 shrink-0 transition-colors",
                                                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"
                                            )} />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                                <span className="text-xs font-medium leading-tight opacity-60 truncate">{item.description}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="shrink-0 px-4 py-6 space-y-1.5 border-t border-zinc-200 dark:border-zinc-900 mt-auto">
                            {sidebarItems.filter(item => item.bottom).map((item) => {
                                const isActive = activeSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            if (item.id === 'help') {
                                                dispatch(setSupportAssistantOpen(true));
                                                return;
                                            }
                                            setActiveSection(item.id);
                                        }}
                                        className={cn(
                                            "w-full flex items-start gap-3.5 p-3.5 rounded-xl transition-all text-left relative cursor-pointer",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200/50 dark:ring-indigo-800/50"
                                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80",
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-5 w-5 mt-0.5 shrink-0 transition-colors",
                                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"
                                        )} />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                            <span className="text-xs font-medium leading-tight opacity-60 truncate">{item.description}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main content — vertical scroll */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 min-w-0 min-h-0 h-full overflow-hidden">

                        {/* Header */}
                        <div className="h-20 px-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between flex-shrink-0 bg-white/50 backdrop-blur-md dark:bg-zinc-950/50">
                           <div className="flex items-center gap-4 min-w-0">
                                <h1 className="text-lg font-bold text-zinc-900 dark:text-white capitalize flex items-center gap-1.5 min-w-0">
                                    <span className="text-zinc-400 dark:text-zinc-500 font-medium normal-case shrink-0">
                                        Settings
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500 shrink-0">/</span>
                                    <span className="truncate">
                                        {sidebarItems.find(i => i.id === activeSection)?.label}
                                    </span>
                                </h1>
                            </div>

                            <div className="flex items-center gap-3">
                                <SaveChangesButton size="md" />
                                <AgentModelShareBar
                                    agentId={agent.id}
                                    modelId={agent.modelId || agent.aiModel?.id || null}
                                    onUpdated={onUpdate}
                                    size="md"
                                />
                                <Button
                                    variant="ghost"
                                    className="gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium rounded-xl h-10 px-4 text-sm"
                                    onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View in builder
                                </Button>
                                <AgentMoreActions
                                    agent={agent}
                                    onUpdated={onUpdate}
                                    onPublish={handlePublishClick}
                                    onDeleted={() => {
                                        onOpenChange(false);
                                        router.push("/dashboard/agents");
                                    }}
                                    triggerClassName="h-9 w-9 rounded-xl border-zinc-200"
                                />
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-10 bg-zinc-50/20 dark:bg-zinc-900/10">
                            <div className="max-w-4xl mx-auto w-full">
                                {activeSection === 'instructions' && (
                                    <InstructionsTab
                                        agentId={agent.id}
                                        systemPrompt={agent.systemPrompt}
                                        isReconfiguring={false}
                                        onUpdate={onUpdate}
                                    />
                                )}
                                {activeSection === 'tools' && (
                                    <ToolsTab
                                        agentId={agent.id}
                                        tools={agent.tools || []}
                                        isReconfiguring={false}
                                        onUpdate={onUpdate}
                                    />
                                )}
                                {activeSection === 'knowledge' && (
                                    <KnowledgeTab
                                        agentId={agent.id}
                                        knowledgeConfig={agent.metadata?.knowledge || agent.metadata}
                                        isReconfiguring={false}
                                        onUpdate={onUpdate}
                                    />
                                )}
                                {activeSection === 'memory' && (
                                    <MemoryTab
                                        agentId={agent.id}
                                        agent={agent}
                                        isReconfiguring={false}
                                        onUpdate={onUpdate}
                                    />
                                )}
                                {activeSection === 'triggers' && (
                                    <TriggersTab
                                        agentId={agent.id}
                                        triggers={agent.triggers || []}
                                        schedules={agent.schedules || []}
                                        isReconfiguring={false}
                                        onUpdate={onUpdate}
                                    />
                                )}
                                {activeSection === 'advanced' && (
                                    <AdvancedTab
                                        agentId={agent.id}
                                        agent={agent}
                                        onUpdate={onUpdate}
                                        isOwner={agent.viewerIsOwner}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </AgentSettingsSaveProvider>
            </DialogContent>

            <MarketplaceGuardDialog isOpen={isGuardOpen} onOpenChange={setIsGuardOpen} />
            {isPublishModalOpen && (
                <PublishEntityModal
                    open={isPublishModalOpen}
                    onOpenChange={setIsPublishModalOpen}
                    entityType="agent"
                    entityId={agent.id}
                    initialTitle={agent.name}
                    initialDescription={agent.systemPrompt}
                    entityContext={{
                        avatar: agent.avatar,
                        description: agent.systemPrompt,
                        status: agent.model ?? "Agent",
                        metadata: [
                            ...(agent.tools?.length ? [{ label: "Tools", value: agent.tools.length }] : []),
                            ...(agent.triggers?.length ? [{ label: "Triggers", value: agent.triggers.length }] : []),
                            ...(agent.schedules?.length ? [{ label: "Schedules", value: agent.schedules.length }] : []),
                        ],
                        capabilities: agent.tools?.map((t: any) => t.name ?? t.id) ?? [],
                    }}
                />
            )}
        </Dialog>
    );
}
