import { useState, useCallback } from 'react';
import { ParsedCommand } from '../types/command.types';

export function useCommandParser() {
    const parse = useCallback((input: string): ParsedCommand => {
        const trimmed = input.trim();

        // Command types
        if (trimmed.startsWith('/chat')) {
            return {
                raw: trimmed,
                type: 'chat',
                intent: 'chat',
                params: {
                    message: trimmed.substring(5).trim()
                }
            };
        }

        if (trimmed.startsWith('/agent')) {
            return {
                raw: trimmed,
                type: 'agent',
                intent: 'discover',
                params: {
                    query: trimmed.substring(6).trim()
                }
            };
        }

        if (trimmed.startsWith('/')) {
            return {
                raw: trimmed,
                type: 'action',
                intent: trimmed.substring(1).split(' ')[0],
                params: {
                    query: trimmed.substring(1).split(' ').slice(1).join(' ')
                }
            };
        }

        // Natural language default
        return {
            raw: trimmed,
            type: 'chat', // Default to chat/natural language
            intent: 'query',
            params: {
                message: trimmed
            }
        };
    }, []);

    return { parse };
}

export default useCommandParser;
