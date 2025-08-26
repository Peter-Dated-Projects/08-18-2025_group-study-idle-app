import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotionTokens, updateUserNotionTokens } from "@/lib/firestore";
import { NOTION_API_VERSION } from "@/components/constants";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    console.warn("/api/notion/storage/verify: User not authenticated");
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  // Get the notion tokens including the duplicated_block_id
  const notionData = await getNotionTokens(userId);
  if (!notionData) {
    console.warn("/api/notion/storage/verify: Notion tokens not found");
    return NextResponse.json({ error: "Notion tokens not found" }, { status: 401 });
  }

  if (!notionData.duplicated_block_id) {
    console.warn("/api/notion/storage/verify: No duplicated block ID found");
    return NextResponse.json(
      {
        error:
          "No duplicated block ID found. Please reconnect your Notion account and use the provided Template.",
      },
      { status: 400 }
    );
  }

  // Verify the duplicated block and find the session database ID with retry logic
  let sessionDatabaseId: string | null = null;

  try {
    const blockResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/blocks/${notionData.duplicated_block_id}/children`,
      {
        method: "GET",
      }
    );

    const blockData = await blockResponse.json();
    console.log(`/api/notion/storage/verify: Fetched block data: ${JSON.stringify(blockData)}`);
    if (!blockResponse.ok) {
      console.warn("/api/notion/storage/verify: No Study Sessions Database found in");

      return NextResponse.json(
        {
          error: "No Study Sessions Database found. Please reconnect your Notion account.",
        },
        { status: 400 }
      );
    }

    const foundDatabaseId = blockData.results.find(
      (block: { type: string; id: string }) => block.type === "child_database"
    )?.id;

    if (!foundDatabaseId) {
      console.warn(`/api/notion/storage/verify: No child_database found in`);
      return NextResponse.json(
        {
          error: "No Study Sessions Database found. Please reconnect your Notion account.",
        },
        { status: 400 }
      );
    }

    sessionDatabaseId = foundDatabaseId;
    console.log(
      `/api/notion/storage/verify: Successfully found session database ID: ${sessionDatabaseId}`
    );
  } catch (error) {
    console.error(`/api/notion/storage/verify: Error fetching session database ID`, error);
  }

  if (!sessionDatabaseId) {
    console.error(
      "/api/notion/storage/verify: Failed to fetch session database ID after all retry attempts"
    );
    return NextResponse.json(
      {
        error:
          "Failed to set up your session database. Please refresh the page or reconnect your Notion account.",
        needsReauth: true,
      },
      { status: 500 }
    );
  }

  // Check if deleted or archived
  const verifyResponse = await fetchWithTokenRefresh(
    userId,
    `https://api.notion.com/v1/blocks/${sessionDatabaseId}`,
    {
      method: "GET",
    }
  );
  const verifyData = await verifyResponse.json();
  if (verifyData.in_trash || verifyData.archived) {
    console.warn(
      `/api/notion/storage/verify: Session database is ${
        verifyData.in_trash ? "deleted" : "archived"
      }`
    );
    return NextResponse.json(
      {
        error:
          "Your Study Sessions Database is deleted or archived. Please reconnect your Notion account.",
      },
      { status: 400 }
    );
  }

  // Update the Firestore database with the found session_database_id
  try {
    await updateUserNotionTokens(userId, {
      ...notionData,
      session_database_id: sessionDatabaseId,
      updated_at: new Date(Date.now()),
    });

    console.log(
      `/api/notion/storage/verify: Successfully updated session database ID in Firestore: ${sessionDatabaseId}`
    );
    return NextResponse.json({ success: true, session_database_id: sessionDatabaseId });
  } catch (error) {
    console.error("/api/notion/storage/verify: Error updating Firestore database:", error);
    return NextResponse.json({ error: "Failed to update database configuration" }, { status: 500 });
  }
}
