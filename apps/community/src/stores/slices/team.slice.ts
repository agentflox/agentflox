import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { serializeDates } from "../utils/serialize";

export interface TeamState {
  items: Record<string, any>;
  currentId: string | null;
}

const initialState: TeamState = {
  items: {},
  currentId: null,
};

const teamSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    setCurrentTeam(state, action: PayloadAction<string | null>) {
      state.currentId = action.payload;
    },
    upsertTeam(state, action: PayloadAction<{ id: string; data: any }>) {
      const { id, data } = action.payload;
      const serializableData = serializeDates(data);
      state.items[id] = { ...(state.items[id] || {}), ...serializableData, id, updatedAt: new Date().toISOString() };
    },
    removeTeam(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
      if (state.currentId === action.payload) state.currentId = null;
    },
  },
});

export const { setCurrentTeam, upsertTeam, removeTeam } = teamSlice.actions;
export default teamSlice.reducer;


