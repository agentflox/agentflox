import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { serializeDates } from "../utils/serialize";

export interface ProjectState {
  items: Record<string, any>;
  currentId: string | null;
}

const initialState: ProjectState = {
  items: {},
  currentId: null,
};

const projectSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setCurrentProject(state, action: PayloadAction<string | null>) {
      state.currentId = action.payload;
    },
    upsertProject(state, action: PayloadAction<{ id: string; data: any }>) {
      const { id, data } = action.payload;
      const serializableData = serializeDates(data);
      state.items[id] = { ...(state.items[id] || {}), ...serializableData, id, updatedAt: new Date().toISOString() };
    },
    removeProject(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
      if (state.currentId === action.payload) state.currentId = null;
    },
  },
});

export const { setCurrentProject, upsertProject, removeProject } = projectSlice.actions;
export default projectSlice.reducer;


