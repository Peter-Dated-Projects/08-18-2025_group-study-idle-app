import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface NotionDatabase {
  id: string;
  title: Array<{
    type: string;
    text?: {
      content: string;
    };
    plain_text: string;
  }>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionListDatabasesResponse {
  results: NotionDatabase[];
  next_cursor: string | null;
  has_more: boolean;
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("notion_token")?.value;

  if (!tokenCookie) {
    return NextResponse.json({ error: "No authentication token found" }, { status: 401 });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenCookie);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token data" }, { status: 401 });
  }

  const { access_token, workspace_id } = tokenData;
  if (!access_token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          value: "database",
          property: "object",
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        {
          error: "Failed to fetch databases",
          details: error,
        },
        { status: response.status }
      );
    }

    const data: NotionListDatabasesResponse = await response.json();

    // Format databases for easier consumption
    const formattedDatabases = data.results.map((db) => ({
      id: db.id,
      title: db.title.map((t) => t.plain_text).join("") || "Untitled",
      url: db.url,
      created_time: db.created_time,
      last_edited_time: db.last_edited_time,
    }));

    return NextResponse.json({
      workspace_id,
      databases: formattedDatabases,
      has_more: data.has_more,
      next_cursor: data.next_cursor,
    });
  } catch (error) {
    console.error("Error fetching Notion databases:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching databases",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // Handle pagination with cursor
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("notion_token")?.value;

  if (!tokenCookie) {
    return NextResponse.json({ error: "No authentication token found" }, { status: 401 });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenCookie);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token data" }, { status: 401 });
  }

  const { access_token } = tokenData;
  const { start_cursor } = await req.json();

  try {
    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          value: "database",
          property: "object",
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
        ...(start_cursor && { start_cursor }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        {
          error: "Failed to fetch databases",
          details: error,
        },
        { status: response.status }
      );
    }

    const data: NotionListDatabasesResponse = await response.json();

    const formattedDatabases = data.results.map((db) => ({
      id: db.id,
      title: db.title.map((t) => t.plain_text).join("") || "Untitled",
      url: db.url,
      created_time: db.created_time,
      last_edited_time: db.last_edited_time,
    }));

    return NextResponse.json({
      databases: formattedDatabases,
      has_more: data.has_more,
      next_cursor: data.next_cursor,
    });
  } catch (error) {
    console.error("Error fetching Notion databases:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching databases",
      },
      { status: 500 }
    );
  }
}
