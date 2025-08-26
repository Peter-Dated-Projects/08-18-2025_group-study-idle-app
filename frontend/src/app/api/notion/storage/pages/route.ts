import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, getUserSessionDatabaseId } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    id: string;
  };
  last_edited_by: {
    id: string;
  };
  cover: unknown;
  icon: unknown;
  parent: {
    database_id: string;
  };
  archived: boolean;
  properties: Record<string, unknown>;
  url: string;
}

interface QueryDatabaseRequest {
  filter?: Record<string, unknown>;
  sorts?: Record<string, unknown>[];
  start_cursor?: string;
  page_size?: number;
}

/**
 * Simple GET request for all pages in the storage DB without filters/sorting
 * @param req
 * @returns
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) {
    console.warn("/api/notion/storage/pages: User ID not found in cookies");
    return NextResponse.json({ error: "Unauthorized", needsReauth: true }, { status: 401 });
  }

  // Retrieve database ID from firestore
  const databaseId = await getUserSessionDatabaseId(userId);
  if (!databaseId) {
    console.warn("/api/notion/storage/pages: No database found for user");
    return NextResponse.json(
      { error: "No database found for user", needsReauth: true },
      { status: 404 }
    );
  }
  const response = await fetchWithTokenRefresh(
    userId,
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sorts: [
          {
            property: "Name",
            direction: "descending",
          },
        ],
      }),
    }
  );

  const responseData = await response.json();
  console.log(responseData);
  console.log("Targeted DATABASE: ", databaseId);
  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch pages", needsReauth: true },
      { status: 500 }
    );
  }
  return NextResponse.json(responseData);
}
