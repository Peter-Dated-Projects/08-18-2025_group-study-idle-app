import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import inventoryReducer from "./slices/inventorySlice";
import worldReducer from "./slices/worldSlice";
import timerReducer from "./slices/timerSlice";
import tasksReducer from "./slices/tasksSlice";
import walletReducer from "./slices/walletSlice";
import shopReducer from "./slices/shopSlice";
import socialReducer from "./slices/socialSlice";
import leaderboardReducer from "./slices/leaderboardSlice";
import notificationReducer from "./slices/notificationSlice";
import musicReducer from "./slices/musicSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
    world: worldReducer,
    timer: timerReducer,
    tasks: tasksReducer,
    wallet: walletReducer,
    shop: shopReducer,
    social: socialReducer,
    leaderboard: leaderboardReducer,
    notifications: notificationReducer,
    music: musicReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
        ignoredPaths: ["register"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
