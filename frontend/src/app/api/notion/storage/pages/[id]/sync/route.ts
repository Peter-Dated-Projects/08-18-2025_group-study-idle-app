import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, getUserSessionDatabaseId } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

export interface TaskSyncData {
  id: string;
  title: string;
  completed: boolean;
  indent: number;
}

export interface SyncAllTasksRequest {
  sessionPageId: string;
  tasks: TaskSyncData[];
}

/**
 * POST function for syncing all tasks to a Notion page
 * This replaces all to_do blocks on the page with the provided tasks
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) {
    console.warn("/api/notion/storage/pages/[id]/sync: User ID not found in cookies");
    return NextResponse.json({ error: "Unauthorized", needsReauth: true }, { status: 401 });
  }

  // Retrieve database ID from firestore
  const databaseId = await getUserSessionDatabaseId(userId);
  if (!databaseId) {
    console.warn("/api/notion/storage/pages/[id]/sync: No database found for user");
    return NextResponse.json(
      { error: "No database found for user", needsReauth: true },
      { status: 404 }
    );
  }

  // Check for required fields in request body
  const requestBody: SyncAllTasksRequest = await req.json();
  if (!requestBody.sessionPageId || !Array.isArray(requestBody.tasks)) {
    console.warn("/api/notion/storage/pages/[id]/sync: Missing required fields in request body");
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sessionPageId = requestBody.sessionPageId;

  try {
    // First, get all current blocks from the page
    const currentBlocksResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/blocks/${sessionPageId}/children`,
      {
        method: "GET",
      }
    );

    if (!currentBlocksResponse.ok) {
      console.error(
        "/api/notion/storage/pages/[id]/sync: Error fetching current blocks:",
        currentBlocksResponse.statusText
      );
      return NextResponse.json(
        { error: "Failed to fetch current blocks", needsReauth: true },
        { status: 500 }
      );
    }

    const currentBlocksData = await currentBlocksResponse.json();

    // Delete all existing to_do blocks
    if (currentBlocksData.results && Array.isArray(currentBlocksData.results)) {
      for (const block of currentBlocksData.results) {
        if (block.type === "to_do") {
          await fetchWithTokenRefresh(userId, `https://api.notion.com/v1/blocks/${block.id}`, {
            method: "DELETE",
          });
        }
      }
    }

    // Create new blocks for all tasks
    const newBlocks = requestBody.tasks.map((task) => ({
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [
          {
            type: "text",
            text: {
              content: task.title,
              link: null,
            },
          },
        ],
        checked: task.completed,
      },
    }));

    // Add all new blocks to the page
    if (newBlocks.length > 0) {
      const createBlocksResponse = await fetchWithTokenRefresh(
        userId,
        `https://api.notion.com/v1/blocks/${sessionPageId}/children`,
        {
          method: "POST",
          body: JSON.stringify({
            children: newBlocks,
          }),
        }
      );

      if (!createBlocksResponse.ok) {
        console.error(
          "/api/notion/storage/pages/[id]/sync: Error creating new blocks:",
          createBlocksResponse.statusText
        );
        return NextResponse.json(
          { error: "Failed to create new blocks", needsReauth: true },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      syncedTasks: requestBody.tasks.length,
      message: "All tasks synced successfully",
    });
  } catch (error) {
    console.error("/api/notion/storage/pages/[id]/sync: Error syncing tasks:", error);
    return NextResponse.json({ error: "Failed to sync tasks", needsReauth: true }, { status: 500 });
  }
}
