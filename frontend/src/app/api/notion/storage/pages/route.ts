import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, getUserSessionDatabaseId } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";
import { getPrimaryDataSourceId, queryDataSource } from "@/lib/notion-datasource-utils";

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
    console.warn("/api/notion/storage/pages: No database found for user", userId);
    console.warn("/api/notion/storage/pages: User may need to run storage verification first");
    return NextResponse.json(
      { error: "No database found for user", needsReauth: true, needsVerification: true },
      { status: 404 }
    );
  }

  console.log(`/api/notion/storage/pages: Using database ID: ${databaseId}`);

  try {
    // Get the primary data source ID for this database
    const dataSourceId = await getPrimaryDataSourceId(userId, databaseId);
    console.log(`/api/notion/storage/pages: Using data source ID: ${dataSourceId}`);

    // Query the data source instead of the database
    const response = await queryDataSource(userId, dataSourceId, {
      sorts: [
        {
          property: "Name",
          direction: "descending",
        },
      ],
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.warn("/api/notion/storage/pages: Error fetching pages:", responseData);
      return NextResponse.json(
        { error: "Failed to fetch pages", needsReauth: true },
        { status: 500 }
      );
    }

    // console.log("Fetched pages:", responseData.results);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("/api/notion/storage/pages: Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages", needsReauth: true },
      { status: 500 }
    );
  }
}

export interface NewPageDetails {
  title: string;
  icon_emoji: string;
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
  const requestBody: NewPageDetails = await req.json();
  if (!requestBody.title) {
    console.warn("/api/notion/storage/pages: Missing required fields in request body");
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Get the primary data source ID for this database
    const dataSourceId = await getPrimaryDataSourceId(userId, databaseId);
    console.log(`/api/notion/storage/pages: Creating page in data source: ${dataSourceId}`);

    const newPage: Record<string, unknown> = {
      parent: { data_source_id: dataSourceId }, // Updated to use data_source_id
      properties: {
        Name: {
          title: [
            {
              text: {
                content: requestBody.title,
              },
            },
          ],
        },
      },
    };
    if (requestBody.icon_emoji) {
      newPage.icon = {
        emoji: requestBody.icon_emoji,
      };
    }

    const response = await fetchWithTokenRefresh(userId, "https://api.notion.com/v1/pages", {
      method: "POST",
      body: JSON.stringify(newPage),
    });

    if (!response.ok) {
      console.error("/api/notion/storage/pages: Error creating page:", response.statusText);
      return NextResponse.json(
        { error: "Failed to create page", needsReauth: true },
        { status: 500 }
      );
    }

    // Notify app to update sesions
    const responseData = await response.json();
    return NextResponse.json({ ...responseData, updateSessions: true, updateTasks: false });
  } catch (error) {
    console.error("/api/notion/storage/pages: Error creating page:", error);
    return NextResponse.json(
      { error: "Failed to create page", needsReauth: true },
      { status: 500 }
    );
  }
}
