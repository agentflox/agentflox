import { useState, useCallback } from 'react';
import { CommandContext, ParsedCommand } from '../types/command.types';
import { CommandService } from '../services/command.service';
import { useAppDispatch } from '@/hooks/useReduxStore';
import { setLoading, setError, addChatMessage } from '@/stores/slices/command.slice';

export interface ExecutionResult {
    success: boolean;
    message: string;
    data?: any;
    followUpActions?: Array<{
        label: string;
        command: string;
        icon?: string;
    }>;
}

export function useCommandExecution(context: CommandContext) {
    const dispatch = useAppDispatch();
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

    const execute = useCallback(async (input: string): Promise<ExecutionResult> => {
        setIsExecuting(true);
        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            // Add user message to chat history
            dispatch(addChatMessage({
                id: `msg-${Date.now()}`,
                role: 'user',
                content: input,
                timestamp: Date.now(),
            }));

            // Execute command
            const result = await CommandService.execute(input, context);

            // Add AI response to chat history
            if (result.message) {
                dispatch(addChatMessage({
                    id: `msg-${Date.now()}-response`,
                    role: 'assistant',
                    content: result.message,
                    timestamp: Date.now(),
                    metadata: {
                        followUpActions: result.followUpActions,
                        data: result.data,
                    },
                }));
            }

            setLastResult(result);
            return result;
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to execute command';

            dispatch(setError(errorMessage));
            dispatch(addChatMessage({
                id: `msg-${Date.now()}-error`,
                role: 'system',
                content: `Error: ${errorMessage}`,
                timestamp: Date.now(),
            }));

            const errorResult: ExecutionResult = {
                success: false,
                message: errorMessage,
            };

            setLastResult(errorResult);
            return errorResult;
        } finally {
            setIsExecuting(false);
            dispatch(setLoading(false));
        }
    }, [context, dispatch]);

    const parse = useCallback(async (input: string): Promise<ParsedCommand | null> => {
        try {
            return await CommandService.parse(input, context);
        } catch (error) {
            console.error('Failed to parse command:', error);
            return null;
        }
    }, [context]);

    return {
        execute,
        parse,
        isExecuting,
        lastResult,
    };
}

export default useCommandExecution;
