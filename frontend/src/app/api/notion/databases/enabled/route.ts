import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserSession, simpleDecrypt, getUserEnabledDatabases } from "@/lib/firestore";
import { NOTION_API_VERSION } from "@/components/constants";

export async function GET(request: Request) {
  // Get user-enabled databases from Firestore (only template-duplicated ones)
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

  // Get user-enabled databases from Firestore
  const enabledDatabases = await getUserEnabledDatabases(userId);

  if (enabledDatabases.length === 0) {
    return NextResponse.json({
      databases: [],
      message:
        "No databases found. Please duplicate a template from your integration to get started.",
    });
  }

  // Fetch actual database data from Notion API for enabled databases
  const decryptedAccessToken = simpleDecrypt(session.notionTokens.access_token);
  const databasesWithDetails = [];

  for (const enabledDb of enabledDatabases) {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${enabledDb.databaseId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${decryptedAccessToken}`,
          "Notion-Version": NOTION_API_VERSION,
        },
      });

      if (response.ok) {
        const databaseData = await response.json();
        databasesWithDetails.push(databaseData);
      } else {
        console.warn(`Failed to fetch enabled database ${enabledDb.databaseId}:`, response.status);
      }
    } catch (error) {
      console.error(`Error fetching enabled database ${enabledDb.databaseId}:`, error);
    }
  }

  return NextResponse.json({ databases: databasesWithDetails });
}
