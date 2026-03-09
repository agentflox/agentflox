import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { serializeDates } from "../utils/serialize";

export interface ProposalState {
  items: Record<string, any>;
  currentId: string | null;
}

const initialState: ProposalState = {
  items: {},
  currentId: null,
};

const proposalSlice = createSlice({
  name: "proposals",
  initialState,
  reducers: {
    setCurrentProposal(state, action: PayloadAction<string | null>) {
      state.currentId = action.payload;
    },
    upsertProposal(state, action: PayloadAction<{ id: string; data: any }>) {
      const { id, data } = action.payload;
      const serializableData = serializeDates(data);
      state.items[id] = { ...(state.items[id] || {}), ...serializableData, id, updatedAt: new Date().toISOString() };
    },
    removeProposal(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
      if (state.currentId === action.payload) state.currentId = null;
    },
  },
});

export const { setCurrentProposal, upsertProposal, removeProposal } = proposalSlice.actions;
export default proposalSlice.reducer;


