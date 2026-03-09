import React from 'react';
import { cn } from '@/lib/utils';
import { Suggestion } from '../types/command.types';
import { Sparkles, Terminal, Activity, File, Folder, Users, Home, Clock, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

import { getIconComponent } from '../utils/iconUtils';

interface SuggestionListProps {
    suggestions: Suggestion[];
    selectedIndex: number;
    onSelect: (suggestion: Suggestion) => void;
}

export function SuggestionList({ suggestions, selectedIndex, onSelect }: SuggestionListProps) {
    if (suggestions.length === 0) return null;

    return (
        <div className="border-t border-zinc-100 bg-white/50 backdrop-blur-xl">
            <ScrollArea className="max-h-[300px]">
                <div className="p-2 space-y-1">
                    {suggestions.map((suggestion, index) => {
                        const Icon = getIconComponent(suggestion.icon);
                        const isSelected = index === selectedIndex;

                        return (
                            <button
                                key={suggestion.id}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all duration-200",
                                    isSelected
                                        ? "bg-indigo-50/80 text-indigo-900 shadow-sm ring-1 ring-indigo-100"
                                        : "text-zinc-600 hover:bg-zinc-50"
                                )}
                                onClick={() => onSelect(suggestion)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                                        isSelected
                                            ? "bg-indigo-100 border-indigo-200 text-indigo-600"
                                            : "bg-white border-zinc-200 text-zinc-400"
                                    )}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate text-sm">
                                                {suggestion.title}
                                            </span>
                                            {suggestion.type === 'agent' && (
                                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                                    Agent
                                                </span>
                                            )}
                                        </div>
                                        {suggestion.description && (
                                            <span className={cn(
                                                "text-xs truncate",
                                                isSelected ? "text-indigo-700/80" : "text-zinc-500"
                                            )}>
                                                {suggestion.description}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {suggestion.shortcut && (
                                        <kbd className={cn(
                                            "hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border",
                                            isSelected
                                                ? "bg-white border-indigo-200 text-indigo-500"
                                                : "bg-zinc-100 border-zinc-200 text-zinc-400"
                                        )}>
                                            {suggestion.shortcut}
                                        </kbd>
                                    )}
                                    {isSelected && (
                                        <ArrowRight size={14} className="text-indigo-400 animate-in fade-in slide-in-from-left-1" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
            <div className="border-t border-zinc-100 px-3 py-1.5 flex items-center justify-between text-[10px] text-zinc-400 bg-white/50">
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><kbd className="bg-zinc-100 px-1 rounded border border-zinc-200">↑↓</kbd> navigate</span>
                    <span className="flex items-center gap-1"><kbd className="bg-zinc-100 px-1 rounded border border-zinc-200">enter</kbd> select</span>
                </div>
                <div>
                    Agentflox AI Intelligence
                </div>
            </div>
        </div>
    );
}
