import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DocsLayoutStore {
  isSidebarCollapsed: boolean;
  isAIPanelOpen: boolean;
  focusMode: boolean;
  sidebarWidth: number;
  aiPanelWidth: number;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  toggleFocusMode: () => void;
  setSidebarWidth: (width: number) => void;
  setAIPanelWidth: (width: number) => void;
}

export const useDocsLayoutStore = create<DocsLayoutStore>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isAIPanelOpen: false,
      focusMode: false,
      sidebarWidth: 20,
      aiPanelWidth: 25,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      toggleAIPanel: () =>
        set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
      toggleFocusMode: () =>
        set((state) => ({
          focusMode: !state.focusMode,
          isSidebarCollapsed: !state.focusMode,
          isAIPanelOpen: false,
        })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setAIPanelWidth: (width) => set({ aiPanelWidth: width }),
    }),
    { name: "docs-layout-storage" }
  )
);
