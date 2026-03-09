import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Resource } from '@/entities/resources/types';

interface ResourceState {
  currentResource: Resource | null;
}

const initialState: ResourceState = {
  currentResource: null,
};

export const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    setCurrentResource: (state, action: PayloadAction<Resource | null>) => {
      state.currentResource = action.payload;
    },
    upsertResource: (state, action: PayloadAction<Resource>) => {
      if (state.currentResource?.id === action.payload.id) {
        state.currentResource = action.payload;
      }
    },
  },
});

export const { setCurrentResource, upsertResource } = resourceSlice.actions;

export default resourceSlice.reducer;
