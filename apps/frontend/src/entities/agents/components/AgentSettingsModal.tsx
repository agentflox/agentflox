"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    FileText, Sparkles, Zap, Wrench, Brain,
    X, ExternalLink, ChevronDown, Bell,
    Database, Code, Settings, HelpCircle,
    Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstructionsTab } from "./tabs/InstructionsTab";
import { TriggersTab } from "./tabs/TriggersTab";
import { ToolsTab } from "./tabs/ToolsTab";
import { KnowledgeTab } from "./tabs/KnowledgeTab";
import { SkillsTab } from "./tabs/SkillsTab";

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
}) {
    const [activeSection, setActiveSection] = useState("instructions");

    const sidebarItems = [
        { id: 'instructions', label: 'Instructions', description: 'Create guidelines for your agent', icon: FileText },
        { id: 'skills', label: 'Skills', description: 'Defined agent capabilities', icon: Sparkles },
        { id: 'triggers', label: 'Triggers', description: 'How your agent starts', icon: Zap },
        { id: 'tools', label: 'Tools', description: 'Used by agents to complete tasks', icon: Wrench },
        { id: 'knowledge', label: 'Knowledge', description: 'Add your documents and data', icon: Brain },
        { id: 'advanced', label: 'Advanced', description: 'Fine-tune engine & core', icon: Settings, bottom: true },
        { id: 'help', label: 'Need help?', description: 'Guides & Support', icon: HelpCircle, bottom: true },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[96vh] p-0 overflow-hidden gap-0 border-none shadow-2xl rounded-2xl"
            >
                <div className="flex h-full w-full bg-white dark:bg-zinc-950">

                    {/* Sidebar */}
                    <div className="w-80 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0">
                        <div className="h-20 flex items-center px-6 border-b border-zinc-100 dark:border-zinc-900">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <ScrollArea className="flex-1 px-4 py-6">
                            <div className="space-y-1.5">
                                {sidebarItems.filter(item => !item.bottom).map((item) => {
                                    const isActive = activeSection === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={cn(
                                                "w-full flex items-start gap-3.5 p-3.5 rounded-xl transition-all text-left relative",
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
                                                <span className="text-[13px] font-bold tracking-tight">{item.label}</span>
                                                <span className="text-[11px] font-medium leading-tight opacity-60 truncate">{item.description}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <div className="px-4 py-6 space-y-1.5 border-t border-zinc-100 dark:border-zinc-900">
                            {sidebarItems.filter(item => item.bottom).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all text-left text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80",
                                        activeSection === item.id && "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 text-zinc-400 shrink-0" />
                                    <span className="text-[13px] font-bold tracking-tight">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 min-w-0 overflow-hidden">

                        {/* Header */}
                        <div className="h-20 px-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between flex-shrink-0 bg-white/50 backdrop-blur-md dark:bg-zinc-950/50">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                                    {agent.avatar || <Bot className="h-6 w-6 text-zinc-400" />}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                                        {agent.name}
                                    </h2>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[500px]">
                                        {agent.description || 'Expert AI agent ready to assist'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold rounded-xl h-11 px-5">
                                    <ExternalLink className="h-4 w-4" />
                                    View in agent builder
                                </Button>
                                <div className="flex items-center">
                                    <Button className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-bold rounded-l-xl h-11 px-6 border-r border-white/10 dark:border-black/10 shadow-lg">
                                        Save changes
                                    </Button>
                                    <Button className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white rounded-r-xl h-11 px-2 shadow-lg">
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <ScrollArea className="flex-1 p-10 bg-zinc-50/20 dark:bg-zinc-900/10">
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
                                {activeSection === 'skills' && (
                                    <SkillsTab
                                        agentId={agent.id}
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
                                {['advanced', 'help'].includes(activeSection) && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                        <div className="h-20 w-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                            {React.createElement(sidebarItems.find(i => i.id === activeSection)?.icon || Settings, { className: "h-10 w-10 text-zinc-400" })}
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                                {sidebarItems.find(i => i.id === activeSection)?.label} Settings
                                            </h3>
                                            <p className="text-zinc-500 max-w-sm">
                                                Detailed configuration for {sidebarItems.find(i => i.id === activeSection)?.label.toLowerCase()} is currently being synchronized with your agent profile.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
