import { useState, useEffect, useCallback } from 'react';
import { Suggestion, CommandContext } from '../types/command.types';
import { CommandService } from '../services/command.service';

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function useCommandSuggestions(input: string, context: CommandContext) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce input to avoid excessive API calls
    const debouncedInput = useDebounce(input, 300);

    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query || query.length === 0) {
            // Default suggestions when empty
            setSuggestions([
                {
                    id: 'chat-help',
                    type: 'command',
                    title: 'Start AI Chat',
                    description: 'Ask anything about your workspace',
                    icon: 'MessageSquare',
                    shortcut: '/chat',
                    score: 1.0,
                    actionable: true,
                },
                {
                    id: 'agent-list',
                    type: 'command',
                    title: 'Run Agent',
                    description: 'Execute automated workflows',
                    icon: 'Bot',
                    shortcut: '/agent',
                    score: 0.95,
                    actionable: true,
                },
                {
                    id: 'create-new',
                    type: 'command',
                    title: 'Create New',
                    description: 'Create tasks, projects, or teams',
                    icon: 'Plus',
                    shortcut: '/create',
                    score: 0.9,
                    actionable: true,
                },
            ]);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const fetched = await CommandService.getSuggestions(query, context);

            if (fetched && fetched.length > 0) {
                // Ensure icons are stored as strings
                const mapped = fetched.map(s => ({
                    ...s,
                    icon: typeof s.icon === 'string' ? s.icon : (s.icon || s.type),
                }));
                setSuggestions(mapped);
            } else {
                // Fallback to local command suggestions
                if (query.startsWith('/')) {
                    setSuggestions([
                        {
                            id: 'cmd-chat',
                            type: 'command',
                            title: '/chat',
                            description: 'Start a conversation with AI',
                            icon: 'MessageSquare',
                            score: 1.0,
                            actionable: true,
                        },
                        {
                            id: 'cmd-agent',
                            type: 'command',
                            title: '/agent',
                            description: 'Browse and execute agents',
                            icon: 'Bot',
                            score: 0.95,
                            actionable: true,
                        },
                        {
                            id: 'cmd-create',
                            type: 'command',
                            title: '/create',
                            description: 'Create new entity',
                            icon: 'Plus',
                            score: 0.9,
                            actionable: true,
                        },
                    ].filter(s => s.title.includes(query)));
                } else {
                    setSuggestions([]);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch suggestions:', err);
            setError(err.message || 'Failed to load suggestions');

            // Fallback suggestions on error
            setSuggestions([
                {
                    id: 'fallback-chat',
                    type: 'command',
                    title: 'Try /chat',
                    description: 'Start a conversation despite connection issues',
                    icon: 'MessageSquare',
                    score: 1.0,
                    actionable: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [context]);

    useEffect(() => {
        fetchSuggestions(debouncedInput);
    }, [debouncedInput, fetchSuggestions]);

    return { suggestions, isLoading, error };
}



export default useCommandSuggestions;
