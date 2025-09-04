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
  deletes: string[]; // Changed to string array to match frontend
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

    // Debug: Log the actual delete IDs being processed
    if (requestBody.deletes.length > 0) {
      console.log("Delete IDs received:", requestBody.deletes);
      console.log(
        "Delete IDs types:",
        requestBody.deletes.map((id) => typeof id)
      );
      console.log(
        "Delete IDs with undefined/null:",
        requestBody.deletes.filter((id) => id === undefined || id === null || id === "")
      );
    }

    console.log(requestBody);

    // 1. Process deletes first
    for (const blockId of requestBody.deletes) {
      // Skip undefined, null, or empty string IDs
      if (!blockId || blockId.trim() === "") {
        console.warn(`Skipping invalid block ID for deletion:`, blockId);
        result.failed.deleted.push({
          id: blockId || "undefined",
          error: "Invalid block ID",
          attemptCount: 1,
        });
        continue;
      }

      // Remove edits to block being deleted
      requestBody.updates = requestBody.updates.filter((update) => update.id !== blockId);

      // Attempt deletion
      try {
        const deleteResponse = await fetchWithTokenRefresh(
          userId,
          `https://api.notion.com/v1/blocks/${blockId}`,
          {
            method: "DELETE",
          }
        );

        if (deleteResponse.ok) {
          result.deleted.push({ id: blockId, attemptCount: 0 });
          console.log(`Deleted block: ${blockId}`);
        } else {
          const errorText = deleteResponse.statusText;
          console.warn(`Failed to delete block ${blockId}:`, errorText);
          result.failed.deleted.push({
            id: blockId,
            error: errorText,
            attemptCount: 1,
          });
        }
      } catch (error) {
        console.error(`Error deleting block ${blockId}:`, error);
        result.failed.deleted.push({
          id: blockId,
          error: error instanceof Error ? error.message : "Unknown error",
          attemptCount: 1,
        });
      }
    }

    // 2. Process creates
    // organize afters
    const afterMap: Record<string, TaskCreate[]> = {};
    for (const create of requestBody.creates) {
      if (!afterMap[create.after || "null"]) {
        afterMap[create.after || "null"] = [];
      }
      afterMap[create.after || "null"].push(create);
    }

    for (const afterId in afterMap) {
      const creates = afterMap[afterId];

      const childrenJson = creates.map((create) => ({
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
      }));

      try {
        const createBody: { children: Array<Record<string, unknown>>; after?: string | null } = {
          children: [...childrenJson],
        };
        if (creates[0].after) {
          createBody.after = creates[0].after;
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
          for (const create of creates) {
            const newId = responseData.results[0].id;
            result.created.push({
              clientTempId: create.clientTempId,
              id: newId,
              attemptCount: create.attemptCount,
            });
            console.log(`Created block: ${newId}`);
          }
        } else {
          for (const create of creates) {
            if (create.attemptCount < attemptLimit) {
              create.attemptCount++;
              result.failed.created.push({
                clientTempId: create.clientTempId,
                error: responseData.error,
                attemptCount: create.attemptCount,
              });
            }
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
        const updatePayload: {
          to_do?: {
            rich_text?: Array<{
              type: string;
              text: {
                content: string;
                link?: null;
              };
            }>;
            checked?: boolean;
          };
        } = {};

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
