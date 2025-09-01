import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSessionDatabaseId } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

export interface NewTaskDetails {
  title: string;
  sessionPageId: string;
  insertAfter?: string; // Block ID to insert after
}

/**
 * POST function for creating new pages
 * @param: req
 */
export async function POST(req: Request) {
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

  // Check for certain attributes in request body
  const requestBody: NewTaskDetails = await req.json();
  if (!requestBody.title || !requestBody.sessionPageId) {
    console.warn("/api/notion/storage/pages/[id]/new: Missing required fields in request body");
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sessionPageId = requestBody.sessionPageId;
  const newTask: Record<string, unknown> = {
    children: [
      {
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: {
                content: requestBody.title,
                link: null,
              },
            },
          ],
          checked: false,
        },
      },
    ],
  };

  // Add "after" parameter if specified for precise positioning
  if (requestBody.insertAfter) {
    newTask.after = requestBody.insertAfter;
  }

  const response = await fetchWithTokenRefresh(
    userId,
    `https://api.notion.com/v1/blocks/${sessionPageId}/children`,
    {
      method: "PATCH",
      body: JSON.stringify(newTask),
    }
  );

  if (!response.ok) {
    console.error("/api/notion/storage/pages/[id]/new: Error creating Task:", response.statusText);
    return NextResponse.json(
      { error: "Failed to create Task", needsReauth: true },
      { status: 500 }
    );
  }

  // Notify app to update sesions
  const responseData = await response.json();
  return NextResponse.json({ ...responseData, updateSessions: false, updateTasks: true });
}
