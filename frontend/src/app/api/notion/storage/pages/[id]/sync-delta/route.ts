import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, getUserSessionDatabaseId } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

export interface TaskCreate {
  title: string;
  completed: boolean;
  indent: number;
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

export interface SyncDeltaRequest {
  sessionPageId: string;
  creates: TaskCreate[];
  updates: TaskUpdate[];
  deletes: TaskDelete[];
}

export interface SyncDeltaResponse {
  created: Array<{ clientTempId: string; id: string; attemptCount: number }>;
  updated: Array<{ id: string; attemptCount: number }>;
  deleted: Array<{ id: string; attemptCount: number }>;

  failed: {
    created: Array<{ clientTempId: string; error: string; attemptCount: number }>;
    updated: Array<{ id: string; error: string; attemptCount: number }>;
    deleted: Array<{ id: string; error: string; attemptCount: number }>;
  };
}

/**
 * POST function for delta-based task syncing to a Notion page
 * Processes creates, updates, and deletes in batches
 */
export async function POST(req: Request) {
  const attemptLimit = 3;
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) {
    console.warn("/api/notion/storage/pages/[id]/sync-delta: User ID not found in cookies");
    return NextResponse.json({ error: "Unauthorized", needsReauth: true }, { status: 401 });
  }

  // Retrieve database ID from firestore
  const databaseId = await getUserSessionDatabaseId(userId);
  if (!databaseId) {
    console.warn("/api/notion/storage/pages/[id]/sync-delta: No database found for user");
    return NextResponse.json(
      { error: "No database found for user", needsReauth: true },
      { status: 404 }
    );
  }

  // Check for required fields in request body
  const requestBody: SyncDeltaRequest = await req.json();
  if (
    !requestBody.sessionPageId ||
    !Array.isArray(requestBody.creates) ||
    !Array.isArray(requestBody.updates) ||
    !Array.isArray(requestBody.deletes)
  ) {
    console.warn(
      "/api/notion/storage/pages/[id]/sync-delta: Missing required fields in request body"
    );
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sessionPageId = requestBody.sessionPageId;
  const result: SyncDeltaResponse = {
    created: [],
    updated: [],
    deleted: [],

    failed: {
      created: [],
      updated: [],
      deleted: [],
    },
  };

  try {
    console.log(
      `Processing deltas: ${requestBody.creates.length} creates, ${requestBody.updates.length} updates, ${requestBody.deletes.length} deletes`
    );

    // 1. Process deletes first
    for (const block of requestBody.deletes) {
      try {
        const deleteResponse = await fetchWithTokenRefresh(
          userId,
          `https://api.notion.com/v1/blocks/${block.id}`,
          {
            method: "DELETE",
          }
        );

        if (deleteResponse.ok) {
          result.deleted.push(block);
          console.log(`Deleted block: ${block.id}`);
        } else {
          console.warn(`Failed to delete block ${block.id}:`, deleteResponse.statusText);
          if (block.attemptCount < attemptLimit) {
            block.attemptCount++;
            result.failed.deleted.push({
              id: block.id,
              error: deleteResponse.statusText,
              attemptCount: block.attemptCount,
            });
          }
        }
      } catch (error) {
        console.error(`Error deleting block ${block.id}:`, error);
      }
    }

    // 2. Process creates
    for (const create of requestBody.creates) {
      // Separate request for each new block
      try {
        const createBody: { children: any[]; after?: string | null } = {
          children: [
            {
              object: "block",
              type: "to_do",
              to_do: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: create.title,
                      link: null,
                    },
                  },
                ],
                checked: create.completed,
              },
            },
          ],
        };
        if (create.after) {
          createBody.after = create.after;
        }

        // Send request
        const response = await fetchWithTokenRefresh(
          userId,
          `https://api.notion.com/v1/blocks/${sessionPageId}/children`,
          {
            method: "PATCH",
            body: JSON.stringify(createBody),
          }
        );

        const responseData = await response.json();
        if (response.ok) {
          const newId = responseData.results[0].id;
          result.created.push({
            clientTempId: create.clientTempId,
            id: newId,
            attemptCount: create.attemptCount,
          });
          console.log(`Created block: ${newId}`);
        } else {
          if (create.attemptCount < attemptLimit) {
            create.attemptCount++;
            result.failed.created.push({
              clientTempId: create.clientTempId,
              error: responseData.error,
              attemptCount: create.attemptCount,
            });
          }
        }
      } catch (error) {
        console.error(`Error creating block under ${sessionPageId}:`, error);
        // Handle error (e.g., log it, return a response, etc.)
      }
    }

    // 3. Process updates
    for (const update of requestBody.updates) {
      try {
        const updatePayload: any = {};

        // Build the update payload based on what fields changed
        if (update.title !== undefined) {
          updatePayload.to_do = {
            rich_text: [
              {
                type: "text",
                text: {
                  content: update.title,
                  link: null,
                },
              },
            ],
          };
        }

        if (update.completed !== undefined) {
          if (!updatePayload.to_do) updatePayload.to_do = {};
          updatePayload.to_do.checked = update.completed;
        }

        // Only send update if there are changes
        if (Object.keys(updatePayload).length > 0) {
          const updateResponse = await fetchWithTokenRefresh(
            userId,
            `https://api.notion.com/v1/blocks/${update.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(updatePayload),
            }
          );

          if (updateResponse.ok) {
            result.updated.push({ id: update.id, attemptCount: update.attemptCount });
            console.log(`Updated block: ${update.id}`);
          } else {
            console.warn(`Failed to update block ${update.id}:`, updateResponse.statusText);
            if (update.attemptCount < attemptLimit) {
              update.attemptCount++;
              result.failed.updated.push({
                id: update.id,
                error: updateResponse.statusText,
                attemptCount: update.attemptCount,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error updating block ${update.id}:`, error);
      }
    }

    console.log(
      `Delta sync completed: ${result.created.length} created, ${result.updated.length} updated, ${result.deleted.length} deleted`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("/api/notion/storage/pages/[id]/sync-delta: Error processing deltas:", error);
    return NextResponse.json(
      { error: "Failed to process sync deltas", needsReauth: true },
      { status: 500 }
    );
  }
}
