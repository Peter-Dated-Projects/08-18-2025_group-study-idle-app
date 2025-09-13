export interface MessageState {
  message: string;
  messageType: "success" | "error" | "";
}

export interface LoadingState {
  loading: boolean;
}

export interface Friend {
  id: string;
}

export interface Group {
  id: string;
  creator_id: string;
  member_ids: string[];
  group_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  user_id: string;
  group_count: string;
  group_ids: string[];
  friend_count: string;
  pomo_count: string;
}

export interface User {
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  userId?: string;
}

export interface NotificationMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  timestamp: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}
