import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: {
        followUpActions?: Array<{
            label: string;
            command: string;
            icon?: string;
        }>;
        data?: any;
    };
}

interface ChatViewProps {
    messages: ChatMessage[];
    isLoading?: boolean;
    onActionClick?: (command: string) => void;
}

export function ChatView({ messages, isLoading, onActionClick }: ChatViewProps) {
    if (messages.length === 0 && !isLoading) {
        return (
            <div className="px-6 py-12 text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 text-indigo-200" />
                <h3 className="text-sm font-medium text-zinc-700 mb-2">
                    AI Assistant Ready
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Ask me anything about your workspace, or use commands like <code className="px-1 py-0.5 bg-zinc-100 rounded text-indigo-600">/create task</code>
                </p>
            </div>
        );
    }

    return (
        <div className="border-t border-zinc-100 bg-white/50">
            <ScrollArea className="max-h-[400px]">
                <div className="p-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300",
                                message.role === 'user' && "flex-row-reverse"
                            )}
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                message.role === 'user'
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                    : message.role === 'assistant'
                                        ? "bg-purple-50 border-purple-200 text-purple-600"
                                        : "bg-zinc-50 border-zinc-200 text-zinc-500"
                            )}>
                                {message.role === 'user' ? (
                                    <User size={16} />
                                ) : message.role === 'assistant' ? (
                                    <Bot size={16} />
                                ) : (
                                    <span className="text-xs">!</span>
                                )}
                            </div>

                            {/* Message Content */}
                            <div className={cn(
                                "flex-1 space-y-2",
                                message.role === 'user' && "flex flex-col items-end"
                            )}>
                                <div className={cn(
                                    "rounded-lg px-4 py-2.5 text-sm max-w-[85%]",
                                    message.role === 'user'
                                        ? "bg-indigo-500 text-white"
                                        : message.role === 'assistant'
                                            ? "bg-zinc-50 text-zinc-800 border border-zinc-200"
                                            : "bg-amber-50 text-amber-800 border border-amber-200"
                                )}>
                                    <p className="whitespace-pre-wrap leading-relaxed">
                                        {message.content}
                                    </p>
                                </div>

                                {/* Follow-up Actions */}
                                {message.metadata?.followUpActions && message.metadata.followUpActions.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {message.metadata.followUpActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onActionClick?.(action.command)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                            >
                                                {action.label}
                                                <ArrowRight size={12} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className={cn(
                                    "text-[10px] text-zinc-400 mt-1",
                                    message.role === 'user' && "text-right"
                                )}>
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-purple-50 border-purple-200 text-purple-600">
                                <Bot size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="rounded-lg px-4 py-3 bg-zinc-50 border border-zinc-200 max-w-[85%]">
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
