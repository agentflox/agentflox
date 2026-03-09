import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InterfaceSettingsState {
    language: string;
    showAgentIcon: boolean;
    showMessageIcon: boolean;
    commandInterfaceOpen: boolean;
}

const initialState: InterfaceSettingsState = {
    language: 'en',
    showAgentIcon: true,
    showMessageIcon: true,
    commandInterfaceOpen: false,
};

const interfaceSettingsSlice = createSlice({
    name: 'interfaceSettings',
    initialState,
    reducers: {
        setLanguage: (state, action: PayloadAction<string>) => {
            state.language = action.payload;
        },
        setShowAgentIcon: (state, action: PayloadAction<boolean>) => {
            state.showAgentIcon = action.payload;
        },
        setShowMessageIcon: (state, action: PayloadAction<boolean>) => {
            state.showMessageIcon = action.payload;
        },
        setCommandInterfaceOpen: (state, action: PayloadAction<boolean>) => {
            state.commandInterfaceOpen = action.payload;
        },
        resetInterfaceSettings: () => initialState,
    },
});

export const {
    setLanguage,
    setShowAgentIcon,
    setShowMessageIcon,
    setCommandInterfaceOpen,
    resetInterfaceSettings,
} = interfaceSettingsSlice.actions;

export default interfaceSettingsSlice.reducer;
