import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, simpleDecrypt } from "@/lib/firestore";

// This endpoint gets filters for the currently selected database
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Get user session with tokens and selected database
    const session = await getUserSession(userId);
    if (!session || !session.notionTokens) {
      return NextResponse.json({ error: "No Notion authentication found" }, { status: 401 });
    }

    if (!session.selectedDatabase) {
      return NextResponse.json({ error: "No database selected" }, { status: 400 });
    }

    const databaseId = session.selectedDatabase.id;

    // Forward the request to the specific database filters endpoint
    const url = new URL(req.url);
    const filtersUrl = `${url.origin}/api/notion/databases/${databaseId}/filters`;

    const response = await fetch(filtersUrl, {
      method: "GET",
      headers: {
        Cookie: cookieStore.toString(), // Forward cookies
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error retrieving filters for selected database:", error);
    return NextResponse.json(
      { error: "Failed to retrieve filters for selected database" },
      { status: 500 }
    );
  }
}
