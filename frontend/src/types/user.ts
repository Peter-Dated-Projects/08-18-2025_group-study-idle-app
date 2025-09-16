export interface UserInfo {
  user_id: string;
  display_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  created_at?: string | null;
  last_login?: string | null;
  provider?: string | null;
}
