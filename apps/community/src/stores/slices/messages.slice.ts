import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MessagesUIState {
  launcherOpen: boolean;
  modalUserId: string | null;
  selectedUserId: string | null;
  showArchived: boolean;
  notificationsEnabled: boolean;
  blockAll: boolean;
  supportAssistantOpen: boolean;
}

const initialState: MessagesUIState = {
  launcherOpen: false,
  modalUserId: null,
  selectedUserId: null,
  showArchived: false,
  notificationsEnabled: true,
  blockAll: false,
  supportAssistantOpen: false,
};

const messagesSlice = createSlice({
  name: 'messagesUI',
  initialState,
  reducers: {
    openLauncher(state) {
      state.launcherOpen = true;
    },
    closeLauncher(state) {
      state.launcherOpen = false;
    },
    openModalWithUser(state, action: PayloadAction<string>) {
      state.modalUserId = action.payload;
      state.launcherOpen = false;
      // also select the user for main messages page/thread
      state.selectedUserId = action.payload;
    },
    closeModal(state) {
      state.modalUserId = null;
    },
    selectUser(state, action: PayloadAction<string | null>) {
      state.selectedUserId = action.payload;
    },
    toggleShowArchived(state) {
      state.showArchived = !state.showArchived;
    },
    setShowArchived(state, action: PayloadAction<boolean>) {
      state.showArchived = action.payload;
    },
    setMessagingConfig(state, action: PayloadAction<Partial<Pick<MessagesUIState, 'showArchived' | 'notificationsEnabled' | 'blockAll'>>>) {
      if (action.payload.showArchived !== undefined) state.showArchived = action.payload.showArchived;
      if (action.payload.notificationsEnabled !== undefined) state.notificationsEnabled = action.payload.notificationsEnabled;
      if (action.payload.blockAll !== undefined) state.blockAll = action.payload.blockAll;
    },
    setSupportAssistantOpen(state, action: PayloadAction<boolean>) {
      state.supportAssistantOpen = action.payload;
    }
  },
});

export const { 
  openLauncher, 
  closeLauncher, 
  openModalWithUser, 
  closeModal, 
  selectUser, 
  toggleShowArchived, 
  setShowArchived,
  setMessagingConfig,
  setSupportAssistantOpen
} = messagesSlice.actions;
export default messagesSlice.reducer;
