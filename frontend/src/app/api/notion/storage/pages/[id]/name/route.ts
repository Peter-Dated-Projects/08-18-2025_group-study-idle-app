import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, getUserSessionDatabaseId } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

interface UpdateSessionNameRequest {
  name: string;
}

/**
 * PATCH function for updating a study session's name
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) {
    console.warn("/api/notion/storage/pages/[id]/name: User ID not found in cookies");
    return NextResponse.json({ error: "Unauthorized", needsReauth: true }, { status: 401 });
  }

  const sessionId = params.id;
  const requestBody: UpdateSessionNameRequest = await req.json();

  if (!requestBody.name || requestBody.name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    // Update the page's Name property in Notion
    const updateResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/pages/${sessionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            Name: {
              title: [
                {
                  text: {
                    content: requestBody.name.trim(),
                  },
                },
              ],
            },
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error("/api/notion/storage/pages/[id]/name: Error updating session name:", errorData);

      if (updateResponse.status === 401 || updateResponse.status === 403) {
        return NextResponse.json(
          { error: "Authentication failed", needsReauth: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: errorData.message || "Failed to update session name" },
        { status: updateResponse.status }
      );
    }

    const updatedPage = await updateResponse.json();

    return NextResponse.json({
      success: true,
      id: updatedPage.id,
      name: requestBody.name.trim(),
      message: "Session name updated successfully",
    });
  } catch (error) {
    console.error("/api/notion/storage/pages/[id]/name: Error updating session name:", error);
    return NextResponse.json(
      { error: "Failed to update session name", needsReauth: true },
      { status: 500 }
    );
  }
}
