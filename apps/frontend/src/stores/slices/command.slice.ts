import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CommandMode, Suggestion, ChatMessage, Agent, CommandContext } from '../../entities/command/types/command.types';

interface CommandState {
    isOpen: boolean;
    mode: CommandMode;
    input: string;
    suggestions: Suggestion[];
    selectedSuggestionIndex: number;
    context: CommandContext;
    chatHistory: ChatMessage[];
    commandHistory: string[];
    historyIndex: number; // -1 means new command
    isLoading: boolean;
    selectedAgent: Agent | null;
    error: string | null;
}

const initialState: CommandState = {
    isOpen: false,
    mode: 'idle',
    input: '',
    suggestions: [],
    selectedSuggestionIndex: 0,
    context: {
        url: '',
    },
    chatHistory: [],
    commandHistory: [],
    historyIndex: -1,
    isLoading: false,
    selectedAgent: null,
    error: null,
};

export const commandSlice = createSlice({
    name: 'command',
    initialState,
    reducers: {
        toggleCommandInterface: (state) => {
            state.isOpen = !state.isOpen;
            if (state.isOpen) {
                // Reset some state on open
                state.input = '';
                state.mode = 'idle';
                state.selectedSuggestionIndex = 0;
                state.historyIndex = -1;
            }
        },
        setOpen: (state, action: PayloadAction<boolean>) => {
            state.isOpen = action.payload;
            if (action.payload) {
                state.input = '';
                state.mode = 'idle';
                state.selectedSuggestionIndex = 0;
                state.historyIndex = -1;
            }
        },
        setInput: (state, action: PayloadAction<string>) => {
            state.input = action.payload;
        },
        setMode: (state, action: PayloadAction<CommandMode>) => {
            state.mode = action.payload;
        },
        setSuggestions: (state, action: PayloadAction<Suggestion[]>) => {
            state.suggestions = action.payload;
            state.selectedSuggestionIndex = 0; // Reset selection when suggestions change
        },
        setSelectedSuggestionIndex: (state, action: PayloadAction<number>) => {
            state.selectedSuggestionIndex = action.payload;
        },
        updateContext: (state, action: PayloadAction<Partial<CommandContext>>) => {
            state.context = { ...state.context, ...action.payload };
        },
        addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.chatHistory.push(action.payload);
        },
        clearChatHistory: (state) => {
            state.chatHistory = [];
        },
        addToCommandHistory: (state, action: PayloadAction<string>) => {
            // Avoid duplicates at the end
            if (state.commandHistory[state.commandHistory.length - 1] !== action.payload) {
                state.commandHistory.push(action.payload);
            }
            state.historyIndex = -1;
        },
        setHistoryIndex: (state, action: PayloadAction<number>) => {
            state.historyIndex = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setSelectedAgent: (state, action: PayloadAction<Agent | null>) => {
            state.selectedAgent = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    toggleCommandInterface,
    setOpen,
    setInput,
    setMode,
    setSuggestions,
    setSelectedSuggestionIndex,
    updateContext,
    addChatMessage,
    clearChatHistory,
    addToCommandHistory,
    setHistoryIndex,
    setLoading,
    setSelectedAgent,
    setError
} = commandSlice.actions;

export default commandSlice.reducer;
