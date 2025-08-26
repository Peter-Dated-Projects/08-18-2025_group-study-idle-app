import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

interface NotionBlockResponse {
  id: string;
  parent: {
    id: string;
    type: string;
  };
  created_time: string;
  last_edited_time: string;
  type: string;
  [key: string]: unknown;
}

/**
 * Queries the Notion API for a block by its ID.
 * @param req The incoming request object.
 * @returns The block data from Notion API.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  // Fetch user session from Firestore
  const session = await getUserSession(userId);
  if (!session) {
    return NextResponse.json({ error: "User session not found" }, { status: 404 });
  }

  // Check if user has Notion tokens
  if (!session.notionTokens) {
    return NextResponse.json({ error: "Notion tokens not found" }, { status: 401 });
  }

  const { id: blockId } = await params;
  const url = new URL(req.url);
  const getChildren = url.searchParams.get("children") === "true";

  // Query Notion API for block data or children
  try {
    const endpoint = getChildren
      ? `https://api.notion.com/v1/blocks/${blockId}/children`
      : `https://api.notion.com/v1/blocks/${blockId}`;

    const response = await fetchWithTokenRefresh(userId, endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn(
        `/api/notion/blocks/${blockId}: Failed to fetch ${
          getChildren ? "block children" : "block details"
        }:`,
        error
      );
      return NextResponse.json(
        {
          error: `Failed to fetch Notion ${getChildren ? "block children" : "block"}`,
          details: error,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    if (!result) {
      return NextResponse.json({ error: "Notion block not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Notion block:", error);
    return NextResponse.json({ error: "Failed to fetch Notion block" }, { status: 500 });
  }
}

/**
 * Updates a Notion block by its ID.
 * @param req The incoming request object with the block update data.
 * @param params The route parameters, including the block ID.
 * @returns A NextResponse object containing the updated block data or an error message.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  // Fetch user session from Firestore
  const session = await getUserSession(userId);
  if (!session) {
    return NextResponse.json({ error: "User session not found" }, { status: 404 });
  }

  // Check if user has Notion tokens
  if (!session.notionTokens) {
    return NextResponse.json({ error: "Notion tokens not found" }, { status: 401 });
  }

  const { id: blockId } = await params;
  const updateData = await req.json();

  // Update block in Notion API
  try {
    const response = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/blocks/${blockId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.warn(`/api/notion/blocks/${blockId}: Failed to update block:`, error);
      return NextResponse.json(
        {
          error: "Failed to update Notion block",
          details: error,
        },
        { status: response.status }
      );
    }

    const updatedBlock: NotionBlockResponse = await response.json();
    return NextResponse.json(updatedBlock);
  } catch (error) {
    console.error("Error updating Notion block:", error);
    return NextResponse.json({ error: "Failed to update Notion block" }, { status: 500 });
  }
}
