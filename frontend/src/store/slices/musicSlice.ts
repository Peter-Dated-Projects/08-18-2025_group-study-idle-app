import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MusicSyncState {
  isConnected: boolean;
  platform: "spotify" | "youtube" | "apple" | null;
  currentTrack: {
    id: string;
    name: string;
    artist: string;
    duration: number;
    position: number;
  } | null;
  isPlaying: boolean;
  volume: number;
  isSynced: boolean;
  roomCode: string | null;
  participants: string[];
  error: string | null;
}

const initialState: MusicSyncState = {
  isConnected: false,
  platform: null,
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  isSynced: false,
  roomCode: null,
  participants: [],
  error: null,
};

const musicSlice = createSlice({
  name: "music",
  initialState,
  reducers: {
    setConnected: (
      state,
      action: PayloadAction<{ platform: "spotify" | "youtube" | "apple"; connected: boolean }>
    ) => {
      state.platform = action.payload.connected ? action.payload.platform : null;
      state.isConnected = action.payload.connected;
      if (!action.payload.connected) {
        state.currentTrack = null;
        state.isPlaying = false;
      }
    },
    setCurrentTrack: (state, action: PayloadAction<MusicSyncState["currentTrack"]>) => {
      state.currentTrack = action.payload;
    },
    setPlayingState: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },
    updateTrackPosition: (state, action: PayloadAction<number>) => {
      if (state.currentTrack) {
        state.currentTrack.position = action.payload;
      }
    },
    setSyncRoom: (state, action: PayloadAction<{ roomCode: string; participants: string[] }>) => {
      state.roomCode = action.payload.roomCode;
      state.participants = action.payload.participants;
      state.isSynced = true;
    },
    leaveSyncRoom: (state) => {
      state.roomCode = null;
      state.participants = [];
      state.isSynced = false;
    },
    addParticipant: (state, action: PayloadAction<string>) => {
      if (!state.participants.includes(action.payload)) {
        state.participants.push(action.payload);
      }
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter((p) => p !== action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setConnected,
  setCurrentTrack,
  setPlayingState,
  setVolume,
  updateTrackPosition,
  setSyncRoom,
  leaveSyncRoom,
  addParticipant,
  removeParticipant,
  setError,
  clearError,
} = musicSlice.actions;

export default musicSlice.reducer;
