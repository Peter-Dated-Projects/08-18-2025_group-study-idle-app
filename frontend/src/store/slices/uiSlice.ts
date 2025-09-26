import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
  // Modal states
  modals: {
    structures: boolean;
    shop: boolean;
    friends: boolean;
    groups: boolean;
    userProfile: boolean;
    settings: boolean;
    globalLeaderboard: boolean;
    groupLeaderboard: boolean;
    leaderboardTabs: boolean;
  };

  // Panel states
  panels: {
    rightPanel: boolean;
    toolsSection: boolean;
  };

  // Active tabs
  activeTabs: {
    toolsSection: "lobby" | "pomo-block" | "music";
    leaderboard: "global" | "group";
  };

  // Loading states
  loading: {
    app: boolean;
    pixi: boolean;
  };

  // UI preferences
  preferences: {
    theme: "light" | "dark";
    soundEnabled: boolean;
    animationsEnabled: boolean;
    compactMode: boolean;
  };

  // Temporary UI state
  temp: {
    selectedPlotIndex: number | null;
    draggedStructure: string | null;
    isEditingSessionName: boolean;
    editingSessionName: string;
    copyMessage: string | null;
  };
}

const initialState: UIState = {
  modals: {
    structures: false,
    shop: false,
    friends: false,
    groups: false,
    userProfile: false,
    settings: false,
    globalLeaderboard: false,
    groupLeaderboard: false,
    leaderboardTabs: false,
  },

  panels: {
    rightPanel: true,
    toolsSection: true,
  },

  activeTabs: {
    toolsSection: "pomo-block",
    leaderboard: "global",
  },

  loading: {
    app: true,
    pixi: true,
  },

  preferences: {
    theme: "light",
    soundEnabled: true,
    animationsEnabled: true,
    compactMode: false,
  },

  temp: {
    selectedPlotIndex: null,
    draggedStructure: null,
    isEditingSessionName: false,
    editingSessionName: "",
    copyMessage: null,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Modal management
    openModal: (state, action: PayloadAction<keyof UIState["modals"]>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<keyof UIState["modals"]>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((modal) => {
        state.modals[modal as keyof UIState["modals"]] = false;
      });
    },

    // Panel management
    togglePanel: (state, action: PayloadAction<keyof UIState["panels"]>) => {
      state.panels[action.payload] = !state.panels[action.payload];
    },
    setPanel: (state, action: PayloadAction<{ panel: keyof UIState["panels"]; open: boolean }>) => {
      state.panels[action.payload.panel] = action.payload.open;
    },

    // Tab management
    setActiveTab: (
      state,
      action: PayloadAction<{ section: keyof UIState["activeTabs"]; tab: string }>
    ) => {
      const { section, tab } = action.payload;
      if (section === "toolsSection") {
        state.activeTabs.toolsSection = tab as "lobby" | "pomo-block" | "music";
      } else if (section === "leaderboard") {
        state.activeTabs.leaderboard = tab as "global" | "group";
      }
    },

    // Loading states
    setLoading: (
      state,
      action: PayloadAction<{ section: keyof UIState["loading"]; loading: boolean }>
    ) => {
      state.loading[action.payload.section] = action.payload.loading;
    },

    // Preferences
    updatePreferences: (state, action: PayloadAction<Partial<UIState["preferences"]>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    toggleTheme: (state) => {
      state.preferences.theme = state.preferences.theme === "light" ? "dark" : "light";
    },

    // Temporary state management
    setSelectedPlotIndex: (state, action: PayloadAction<number | null>) => {
      state.temp.selectedPlotIndex = action.payload;
    },
    setDraggedStructure: (state, action: PayloadAction<string | null>) => {
      state.temp.draggedStructure = action.payload;
    },
    setEditingSessionName: (state, action: PayloadAction<boolean>) => {
      state.temp.isEditingSessionName = action.payload;
      if (!action.payload) {
        state.temp.editingSessionName = "";
      }
    },
    setEditingSessionNameValue: (state, action: PayloadAction<string>) => {
      state.temp.editingSessionName = action.payload;
    },
    setCopyMessage: (state, action: PayloadAction<string | null>) => {
      state.temp.copyMessage = action.payload;
      if (action.payload) {
        // Auto-clear copy message after 2 seconds
        setTimeout(() => {
          state.temp.copyMessage = null;
        }, 2000);
      }
    },

    // Bulk actions
    resetUIState: (state) => {
      // Reset to initial state while preserving preferences
      const preferences = state.preferences;
      Object.assign(state, initialState);
      state.preferences = preferences;
    },

    // Quick actions for common patterns
    openShopModal: (state) => {
      state.modals.shop = true;
    },
  },
});

export const {
  openModal,
  closeModal,
  closeAllModals,
  togglePanel,
  setPanel,
  setActiveTab,
  setLoading,
  updatePreferences,
  toggleTheme,
  setSelectedPlotIndex,
  setDraggedStructure,
  setEditingSessionName,
  setEditingSessionNameValue,
  setCopyMessage,
  resetUIState,
  openShopModal,
} = uiSlice.actions;

export default uiSlice.reducer;
