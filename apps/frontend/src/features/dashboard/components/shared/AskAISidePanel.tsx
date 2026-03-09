"use client";

import React from 'react';
import { ChatView } from "@/features/dashboard/views/project/ChatView";
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Panel,
    Group,
    Separator,
} from "react-resizable-panels";

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export function SidePanel({
    isOpen,
    onClose,
    title,
    icon,
    children
}: SidePanelProps) {
    if (!isOpen) return null;

    return (
        <div className="flex h-full border-l border-zinc-200 bg-white">
            <Group orientation="horizontal">
                <Panel defaultSize="100%" minSize="20%">
                    <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 bg-zinc-50/50">
                            <div className="flex items-center gap-2">
                                {icon}
                                <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">{title}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {children}
                        </div>
                    </div>
                </Panel>
            </Group>
        </div>
    );
}

/**
 * Legacy wrapper for AI Panel - kept for backward compatibility if needed, 
 * but better to use SidePanel directly.
 */
interface AskAISidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    contextType: 'PROJECT' | 'SPACE' | 'TEAM';
    contextId: string;
    contextName: string;
    workspaceId: string;
}

export function AskAISidePanel({
    isOpen,
    onClose,
    contextType,
    contextId,
    contextName,
}: AskAISidePanelProps) {
    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="AI Assistant"
            icon={<div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
        >
            <ChatView
                contextType={contextType}
                contextId={contextId}
                contextName={contextName}
            />
        </SidePanel>
    );
}

/**
 * A wrapper component that handles the layout with a resizable side panel
 */
export function withResizableSidePanel(
    MainContent: React.ReactNode,
    SidePanelContent: React.ReactNode,
    isPanelOpen: boolean,
    onResize?: (size: number) => void
) {
    return (
        <Group orientation="horizontal" className="h-full w-full">
            <Panel defaultSize={isPanelOpen ? "70%" : "100%"} minSize="30%">
                {MainContent}
            </Panel>

            {isPanelOpen && (
                <>
                    <Separator className="w-1.5 hover:bg-indigo-500/10 transition-colors flex items-center justify-center group">
                        <div className="h-8 w-1 rounded-full bg-zinc-200 group-hover:bg-indigo-400 transition-colors" />
                    </Separator>
                    <Panel
                        defaultSize="30%"
                        minSize="20%"
                        onResize={(size) => onResize?.(size.asPercentage)}
                    >
                        {SidePanelContent}
                    </Panel>
                </>
            )}
        </Group>
    );
}

// Alias for backward compatibility (deprecate later)
export const withResizableAI = withResizableSidePanel;
