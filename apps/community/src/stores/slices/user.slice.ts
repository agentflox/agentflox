import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { serializeDates } from "../utils/serialize";

export interface UserState {
  currentUser: any | null;
  isLoading: boolean;
  lastSyncAt: string | null;
}

const initialState: UserState = {
  currentUser: null,
  isLoading: false,
  lastSyncAt: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<any | null>) {
      state.currentUser = action.payload;
    },
    upsertUser(state, action: PayloadAction<{ data: any }>) {
      const { data } = action.payload;
      const serializableData = serializeDates(data);
      state.currentUser = { ...serializableData, updatedAt: new Date().toISOString() };
      state.lastSyncAt = new Date().toISOString();
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearUser(state) {
      state.currentUser = null;
      state.lastSyncAt = null;
    },
  },
});

export const { setCurrentUser, upsertUser, setLoading, clearUser } = userSlice.actions;
export default userSlice.reducer;


