import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  timestamp: number;
  duration?: number; // Auto-dismiss after this many ms
  persistent?: boolean; // Don't auto-dismiss
}

export interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

const initialState: NotificationState = {
  notifications: [],
  maxNotifications: 5,
};

let notificationId = 0;

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, "id" | "timestamp">>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${++notificationId}`,
        timestamp: Date.now(),
        duration: action.payload.duration || 5000, // Default 5 seconds
      };

      state.notifications.unshift(notification);

      // Keep only max notifications
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    // Convenience actions for different types
    addSuccessNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: `notification-${++notificationId}`,
        type: "success",
        message: action.payload,
        timestamp: Date.now(),
        duration: 3000,
      };
      state.notifications.unshift(notification);

      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    addErrorNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: `notification-${++notificationId}`,
        type: "error",
        message: action.payload,
        timestamp: Date.now(),
        duration: 5000,
        persistent: true,
      };
      state.notifications.unshift(notification);

      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    addInfoNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: `notification-${++notificationId}`,
        type: "info",
        message: action.payload,
        timestamp: Date.now(),
        duration: 4000,
      };
      state.notifications.unshift(notification);

      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearAllNotifications,
  addSuccessNotification,
  addErrorNotification,
  addInfoNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;
