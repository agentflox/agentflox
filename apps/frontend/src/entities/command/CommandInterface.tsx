"use client";

import React, { useEffect, useCallback } from "react";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import { useAppDispatch, useAppSelector } from "@/hooks/useReduxStore";
import {
    setOpen,
    setInput,
    setSuggestions,
    setSelectedSuggestionIndex,
    addToCommandHistory,
    setHistoryIndex,
    setMode,
} from "@/stores/slices/command.slice";
import { CommandInput } from "./components/CommandInput";
import { SuggestionList } from "./components/SuggestionList";
import { ChatView } from "./components/ChatView";
import { useCommandSuggestions } from "./hooks/useCommandSuggestions";
import { useCommandExecution } from "./hooks/useCommandExecution";
import { useContextExtraction } from "./hooks/useContextExtraction";
import { cn } from "@/lib/utils";
import { Bot, AlertCircle } from "lucide-react";

export function CommandInterface() {
    const { t } = useInterfaceSettings();
    const dispatch = useAppDispatch();

    // Command State
    const {
        isOpen,
        input,
        suggestions: storedSuggestions,
        selectedSuggestionIndex,
        commandHistory,
        historyIndex,
        mode,
        chatHistory,
        isLoading: stateLoading,
    } = useAppSelector(state => state.command);

    // Extract context from URL
    const context = useContextExtraction();

    // Hooks
    const { suggestions: fetchedSuggestions, isLoading: suggestionsLoading, error: suggestionsError } = useCommandSuggestions(input, context);
    const { execute, isExecuting } = useCommandExecution(context);

    const isLoading = stateLoading || suggestionsLoading || isExecuting;

    // Update suggestions in store
    useEffect(() => {
        dispatch(setSuggestions(fetchedSuggestions));
    }, [fetchedSuggestions, dispatch]);

    // Global keyboard shortcuts
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // Ctrl/Cmd + K to toggle
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                dispatch(setOpen(!isOpen));
            }

            // Escape to close
            if (e.key === "Escape" && isOpen) {
                e.preventDefault();
                dispatch(setOpen(false));
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [isOpen, dispatch]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (selectedSuggestionIndex + 1) % storedSuggestions.length;
            dispatch(setSelectedSuggestionIndex(next));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (storedSuggestions.length > 0) {
                const prev = (selectedSuggestionIndex - 1 + storedSuggestions.length) % storedSuggestions.length;
                dispatch(setSelectedSuggestionIndex(prev));
            } else if (commandHistory.length > 0) {
                // Navigate command history
                const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                dispatch(setHistoryIndex(newIndex));
                dispatch(setInput(commandHistory[newIndex]));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (storedSuggestions.length > 0 && selectedSuggestionIndex >= 0) {
                handleSelect(storedSuggestions[selectedSuggestionIndex]);
            } else {
                handleSubmit(input);
            }
        }
    }, [selectedSuggestionIndex, storedSuggestions, input, commandHistory, historyIndex, dispatch]);

    // Handle suggestion selection
    const handleSelect = useCallback((suggestion: any) => {
        if (suggestion.type === 'command') {
            // If it's a command, fill the input
            dispatch(setInput(suggestion.shortcut || suggestion.title + ' '));
        } else {
            // Execute navigation or action
            handleSubmit(suggestion.title);
        }
    }, [dispatch]);

    // Handle command submission
    const handleSubmit = useCallback(async (text: string) => {
        if (!text || text.trim().length === 0) return;

        // Add to history
        dispatch(addToCommandHistory(text));
        dispatch(setHistoryIndex(-1));

        // Determine mode based on input
        if (text.startsWith('/chat') || (!text.startsWith('/') && text.length > 3)) {
            dispatch(setMode('chat'));
        } else if (text.startsWith('/agent')) {
            dispatch(setMode('agent'));
        } else {
            dispatch(setMode('executing'));
        }

        // Execute command
        await execute(text);

        // Clear input after execution
        dispatch(setInput(''));
        dispatch(setMode('result'));
    }, [dispatch, execute]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[12vh] px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={() => dispatch(setOpen(false))}
            />

            {/* Command Window */}
            <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 transition-all animate-in slide-in-from-bottom-4 duration-300">
                {/* Context Breadcrumb */}
                <div className="px-4 py-2 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-zinc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-zinc-600">
                        <Bot className="h-3.5 w-3.5 text-indigo-500" />
                        {context.workspaceId && (
                            <>
                                <span className="font-medium text-indigo-600">Workspace</span>
                                <span className="text-zinc-300">/</span>
                            </>
                        )}
                        {context.projectId && (
                            <>
                                <span className="font-medium text-purple-600">Project</span>
                                <span className="text-zinc-300">/</span>
                            </>
                        )}
                        <span className="text-zinc-400">AI Command</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {suggestionsError && (
                            <div className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-3 w-3" />
                                <span className="text-[10px]">Offline mode</span>
                            </div>
                        )}
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white border border-zinc-200 text-zinc-500">
                            ESC
                        </kbd>
                    </div>
                </div>

                {/* Input */}
                <CommandInput
                    value={input}
                    onChange={(val) => dispatch(setInput(val))}
                    onKeyDown={handleKeyDown}
                    isLoading={isLoading}
                    prefix={
                        input.startsWith('/') ? (
                            <Bot className="h-5 w-5 text-indigo-500 animate-pulse" />
                        ) : null
                    }
                />

                {/* Chat View or Suggestions */}
                {mode === 'chat' || mode === 'result' ? (
                    <ChatView
                        messages={chatHistory}
                        isLoading={isLoading}
                        onActionClick={(command) => {
                            dispatch(setInput(command));
                            handleSubmit(command);
                        }}
                    />
                ) : (
                    <SuggestionList
                        suggestions={storedSuggestions}
                        selectedIndex={selectedSuggestionIndex}
                        onSelect={handleSelect}
                    />
                )}

                {/* Empty State */}
                {storedSuggestions.length === 0 && !isLoading && input && mode !== 'chat' && (
                    <div className="px-4 py-8 text-center text-zinc-500">
                        <p className="text-sm">
                            No results found. Press <kbd className="font-sans border rounded px-1.5 py-0.5 text-xs bg-zinc-50">Enter</kbd> to ask AI.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Export trigger component
export function CommandTrigger({ className, onClick }: { className?: string, onClick?: () => void }) {
    const dispatch = useAppDispatch();
    const { t } = useInterfaceSettings();

    return (
        <button
            onClick={() => {
                dispatch(setOpen(true));
                onClick?.();
            }}
            className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                className
            )}
            aria-label={t("cmd.trigger_label") || "Open Command Interface"}
            title="Press Ctrl+K"
        >
            <Bot size={20} className="transition-transform hover:scale-110" />
            {/* Subtle pulse indicator */}
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
        </button>
    );
}
