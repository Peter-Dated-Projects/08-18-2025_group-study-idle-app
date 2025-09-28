import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface WalletState {
  balance: number;
  pendingTransactions: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: WalletState = {
  balance: 0,
  pendingTransactions: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchBalance = createAsyncThunk(
  "wallet/fetchBalance",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/pomo-bank/balance`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch balance");
      }

      const data = await response.json();
      return data.balance; // Backend returns { success, user_id, balance, message }
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    updateBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
      state.lastUpdated = Date.now();
    },
    addPendingTransaction: (state, action: PayloadAction<number>) => {
      state.pendingTransactions += action.payload;
    },
    clearPendingTransactions: (state) => {
      state.pendingTransactions = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.balance = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateBalance,
  addPendingTransaction,
  clearPendingTransactions,
  clearError,
  setLoading,
  setError,
} = walletSlice.actions;

export default walletSlice.reducer;
