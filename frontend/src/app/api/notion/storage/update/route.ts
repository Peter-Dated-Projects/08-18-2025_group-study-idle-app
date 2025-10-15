import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";
import { NOTION_API_VERSION } from "@/components/constants";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

/**
 *
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id: databaseId } = await params;

  if (!databaseId) {
    return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
  }

  try {
    const data = await req.json();

    const response = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();

      return NextResponse.json({ error: errorData.error }, { status: response.status });
    }

    const updatedDatabase = await response.json();
    return NextResponse.json(updatedDatabase);
  } catch (error) {
    console.error("Error updating database:", error);
    return NextResponse.json({ error: "Failed to update database" }, { status: 500 });
  }
}
