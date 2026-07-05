"use client";

import React, { useEffect } from 'react';
import {
    Panel,
    Group,
    Separator,
} from "react-resizable-panels";
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";

/**
 * A generic resizeable split layout.
 * Displays MainContent on the left, and optional SidePanelContent on the right.
 * Drag the separator between panels to resize.
 */
export function ResizableSplitLayout({
    MainContent,
    SidePanelContent,
    isPanelOpen,
    onResize,
    mainPanelDefaultSize = "70%",
    mainPanelMinSize = "30%",
    sidePanelDefaultSize = "30%",
    sidePanelMinSize = "20%",
}: {
    MainContent: React.ReactNode;
    SidePanelContent: React.ReactNode;
    isPanelOpen: boolean;
    onResize?: (size: number) => void;
    mainPanelDefaultSize?: number | string;
    mainPanelMinSize?: number | string;
    sidePanelDefaultSize?: number | string;
    sidePanelMinSize?: number | string;
}) {
    
    // NATIVE FIX: Forcefully overrides the global body 'user-select: none' 
    // injected by the resizable library back to normal text selection.
    useEffect(() => {
        const style = document.createElement("style");
        style.innerHTML = `
            body, html {
                user-select: text !important;
                -webkit-user-select: text !important;
            }
            /* Keep the cursor pointer locked properly on the active handle */
            [data-panel-resize-handle] {
                user-select: none !important;
                -webkit-user-select: none !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <Group orientation="horizontal" className="h-full w-full" id="task-ai-split">
            {/* STOP PROPAGATION: Prevents drag/click bubble leaks into the layout manager */}
            <Panel 
                defaultSize={isPanelOpen ? (mainPanelDefaultSize as any) : "100%"} 
                minSize={mainPanelMinSize as any}
                className="select-text"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {MainContent}
            </Panel>

            {isPanelOpen && (
                <>
                    <Separator
                        className="w-2 shrink-0 flex items-center justify-center bg-zinc-100 hover:bg-indigo-100 active:bg-indigo-200 transition-colors cursor-col-resize data-[resize-handle-active]:bg-indigo-200"
                        style={{ touchAction: "none" }}
                    >
                        <div
                            className="h-12 w-1 rounded-full bg-zinc-300 hover:bg-indigo-400 transition-colors pointer-events-none"
                            aria-hidden
                        />
                    </Separator>
                    
                    <Panel
                        defaultSize={sidePanelDefaultSize as any}
                        minSize={sidePanelMinSize as any}
                        className="select-text"
                        onMouseDown={(e) => e.stopPropagation()}
                        onResize={(size) => onResize?.(typeof size === "object" && "asPercentage" in size ? (size as { asPercentage: number }).asPercentage : size)}
                    >
                        {SidePanelContent}
                    </Panel>
                </>
            )}
        </Group>
    );
}

interface SidePanelContainerProps {
    onClose: () => void;
    title: React.ReactNode;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * A clear visual shell for the side panel content.
 * Includes a standard header with title, icon, and close button.
 */
export function SidePanelContainer({
    onClose,
    title,
    icon,
    children
}: SidePanelContainerProps) {
    return (
        <div className="flex h-full flex-col border-l border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 bg-zinc-50/50">
                <div className="flex items-center gap-2">
                    {icon}
                    <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-2">{title}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            {/* STOP PROPAGATION: Isolates the editor viewport wrapper from clicking side effects */}
            <div 
                className="flex-1 overflow-hidden select-text"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
