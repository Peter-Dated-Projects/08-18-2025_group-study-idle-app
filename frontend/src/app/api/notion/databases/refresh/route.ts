import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getUserSession,
  addUserEnabledDatabase,
  UserEnabledDatabase,
  simpleDecrypt,
} from "@/lib/firestore";
import { NOTION_API_VERSION } from "@/components/constants";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  // Get user session with tokens
  const session = await getUserSession(userId);
  if (!session || !session.notionTokens) {
    return NextResponse.json({ error: "No Notion authentication found" }, { status: 401 });
  }

  try {
    // Search for all databases the user has access to
    const decryptedAccessToken = simpleDecrypt(session.notionTokens.access_token);
    const searchResponse = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedAccessToken}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "object",
          value: "database",
        },
      }),
    });

    if (!searchResponse.ok) {
      return NextResponse.json({ error: "Failed to search for databases" }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const databases = searchData.results || [];

    // Add all found databases to user's enabled list
    let addedCount = 0;
    for (const database of databases) {
      const databaseName = database.title?.[0]?.plain_text || database.title || "Untitled Database";
      const userEnabledDb: UserEnabledDatabase = {
        databaseName,
        databaseId: database.id,
      };

      await addUserEnabledDatabase(userId, userEnabledDb);
      addedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Found and added ${addedCount} databases`,
      databases: databases.map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || db.title || "Untitled Database",
      })),
    });
  } catch (error) {
    console.error("Error refreshing databases:", error);
    return NextResponse.json({ error: "Failed to refresh databases" }, { status: 500 });
  }
}
