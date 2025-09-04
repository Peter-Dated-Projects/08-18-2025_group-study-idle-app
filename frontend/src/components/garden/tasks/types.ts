export interface Task {
  id: string;
  title: string;
  deleted: boolean;
  syncInstance: {
    isSyncing: boolean;
    prevSyncCall: Promise<void> | null;
  };
  completed?: boolean;
  notionUrl?: string;
  parentId?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
  indent?: number;
}

export interface TaskCreate {
  title: string;
  completed: boolean;
  clientTempId: string;
  after: string | null;
  attemptCount: number;
}

export interface TaskUpdate {
  id: string;
  title?: string;
  completed?: boolean;
  attemptCount: number;
}

export interface TaskDelete {
  id: string;
  attemptCount: number;
}

export interface SyncRequest {
  sessionPageId: string;
  creates: TaskCreate[];
  updates: TaskUpdate[];
  deletes: string[];
}

export interface SyncResponse {
  created: Array<{ clientTempId: string; id: string }>;
  updated: string[];
  deleted: Array<{ id: string; attemptCount: number }>;
}

export interface StudySession {
  id: string;
  title: string;
  createdTime: string;
  lastEditedTime: string;
  notionUrl: string;
  properties?: Record<string, unknown>;
  archived: boolean;
}

export type SortMode = "custom" | "asc" | "desc";
export type CompletionSortMode = "custom" | "completed" | "uncompleted";
