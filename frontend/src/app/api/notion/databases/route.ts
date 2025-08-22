import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserSession, NotionTokenData, simpleDecrypt } from "@/lib/firestore";
import { NOTION_API_VERSION } from "@/components/constants";

async function fetchNotionDatabases(notionTokenData: NotionTokenData) {
  const decryptedAccessToken = simpleDecrypt(notionTokenData.access_token);
  const response = await fetch("https://api.notion.com/v1/search", {
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

  const data = await response.json();

  if (!response.ok) {
    console.warn("/api/notion/databases: Failed to fetch Notion databases:", data);
    return null;
  }

  return data.results;
}

export async function GET(request: Request) {
  // Request User Session, then request for all databases available in Notion page
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

  // Fetch databases from Notion API
  if (!session.notionTokens) {
    return NextResponse.json({ error: "Notion tokens not found" }, { status: 401 });
  }

  // Ensure fetchNotionDatabases completes before continuing
  const notionDatabases = await fetchNotionDatabases(session.notionTokens);
  if (!notionDatabases) {
    console.log("/api/notion/databases: Failed to fetch Notion databases");
    return NextResponse.json({ error: "Failed to fetch Notion databases" }, { status: 500 });
  }

  console.log("/api/notion/databases: notionDatabases:", notionDatabases);

  return NextResponse.json({ databases: notionDatabases });
}
