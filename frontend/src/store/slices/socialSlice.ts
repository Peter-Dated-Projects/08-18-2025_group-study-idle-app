import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Friend {
  id: string;
  email?: string;
  display_name?: string | null;
  user_picture_url?: string;
  status: "pending" | "accepted";
}

export interface Group {
  group_id: string;
  group_name: string;
  creator_id: string;
  member_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SocialState {
  friends: Friend[];
  groups: Group[];
  isLoading: boolean;
  isLoadingGroups: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: SocialState = {
  friends: [],
  groups: [],
  isLoading: false,
  isLoadingGroups: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchFriends = createAsyncThunk(
  "social/fetchFriends",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/friends/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch friends");
      }

      const data = await response.json();
      return data.friends;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const fetchGroups = createAsyncThunk(
  "social/fetchGroups",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/groups/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch groups");
      }

      const data = await response.json();
      return data.groups;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const addFriend = createAsyncThunk(
  "social/addFriend",
  async ({ userId, friendEmail }: { userId: string; friendEmail: string }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          friend_email: friendEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to add friend");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const createGroup = createAsyncThunk(
  "social/createGroup",
  async ({ userId, groupName }: { userId: string; groupName: string }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          creator_id: userId,
          group_name: groupName,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("Failed to create group");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const joinGroup = createAsyncThunk(
  "social/joinGroup",
  async ({ userId, groupCode }: { userId: string; groupCode: string }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          group_code: groupCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to join group");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

const socialSlice = createSlice({
  name: "social",
  initialState,
  reducers: {
    addFriendOptimistic: (state, action: PayloadAction<Friend>) => {
      state.friends.push(action.payload);
    },
    removeFriend: (state, action: PayloadAction<string>) => {
      state.friends = state.friends.filter((friend) => friend.id !== action.payload);
    },
    updateFriendStatus: (
      state,
      action: PayloadAction<{ friendId: string; status: "pending" | "accepted" }>
    ) => {
      const friend = state.friends.find((f) => f.id === action.payload.friendId);
      if (friend) {
        friend.status = action.payload.status;
      }
    },
    addGroupOptimistic: (state, action: PayloadAction<Group>) => {
      state.groups.push(action.payload);
    },
    updateGroupMembership: (
      state,
      action: PayloadAction<{ groupId: string; memberIds: string[] }>
    ) => {
      const group = state.groups.find((g) => g.group_id === action.payload.groupId);
      if (group) {
        group.member_ids = action.payload.memberIds;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Friends
      .addCase(fetchFriends.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.isLoading = false;
        state.friends = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Groups
      .addCase(fetchGroups.pending, (state) => {
        state.isLoadingGroups = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.isLoadingGroups = false;
        state.groups = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.isLoadingGroups = false;
        state.error = action.payload as string;
      })
      // Add Friend
      .addCase(addFriend.fulfilled, (state, action) => {
        // Friend was added optimistically, now confirm it
        state.lastUpdated = Date.now();
      })
      .addCase(addFriend.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Create Group
      .addCase(createGroup.fulfilled, (state, action) => {
        // Group was added optimistically, update with server response
        const newGroup = action.payload;
        const optimisticIndex = state.groups.findIndex(
          (g) => g.group_name === newGroup.group_name && !g.group_id
        );
        if (optimisticIndex >= 0) {
          state.groups[optimisticIndex] = newGroup;
        } else {
          state.groups.push(newGroup);
        }
        state.lastUpdated = Date.now();
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Join Group
      .addCase(joinGroup.fulfilled, (state, action) => {
        const group = action.payload;
        state.groups.push(group);
        state.lastUpdated = Date.now();
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  addFriendOptimistic,
  removeFriend,
  updateFriendStatus,
  addGroupOptimistic,
  updateGroupMembership,
  clearError,
} = socialSlice.actions;

export default socialSlice.reducer;
