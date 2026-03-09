import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MessagesUIState {
  launcherOpen: boolean;
  modalUserId: string | null;
  selectedUserId: string | null;
}

const initialState: MessagesUIState = {
  launcherOpen: false,
  modalUserId: null,
  selectedUserId: null,
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
  },
});

export const { openLauncher, closeLauncher, openModalWithUser, closeModal, selectUser } = messagesSlice.actions;
export default messagesSlice.reducer;


