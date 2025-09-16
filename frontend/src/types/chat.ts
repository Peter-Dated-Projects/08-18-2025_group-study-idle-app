// Chat message interface for the PlayerChat component
export interface ChatMessage {
  time_created: string; // ISO string format from backend
  user_id: string;
  username: string; // Display name for the user
  content: string;
}
