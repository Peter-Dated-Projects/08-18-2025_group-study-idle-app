import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";
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
  cover: any;
  icon: any;
  parent: {
    database_id: string;
  };
  archived: boolean;
  properties: Record<string, any>;
  url: string;
}

interface QueryDatabaseRequest {
  filter?: any;
  sorts?: any[];
  start_cursor?: string;
  page_size?: number;
}

// Helper function to extract plain text from rich text arrays
function extractPlainText(richTextArray: any[]): string {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj: any) => textObj.plain_text || "").join("");
}

// Helper function to format property values for display
function formatPropertyValue(property: any, type: string): any {
  switch (type) {
    case "title":
      return extractPlainText(property.title);

    case "rich_text":
      return extractPlainText(property.rich_text);

    case "number":
      return property.number;

    case "select":
      return property.select?.name || null;

    case "multi_select":
      return property.multi_select?.map((option: any) => option.name) || [];

    case "date":
      if (property.date) {
        return {
          start: property.date.start,
          end: property.date.end,
          time_zone: property.date.time_zone,
        };
      }
      return null;

    case "checkbox":
      return property.checkbox;

    case "url":
      return property.url;

    case "email":
      return property.email;

    case "phone_number":
      return property.phone_number;

    case "people":
      return (
        property.people?.map((person: any) => ({
          id: person.id,
          name: person.name,
          avatar_url: person.avatar_url,
          type: person.type,
          person: person.person,
        })) || []
      );

    case "files":
      return (
        property.files?.map((file: any) => ({
          name: file.name,
          type: file.type,
          file: file.file,
          external: file.external,
        })) || []
      );

    case "relation":
      return property.relation?.map((rel: any) => rel.id) || [];

    case "formula":
      return property.formula;

    case "rollup":
      return property.rollup;

    case "created_time":
      return property.created_time;

    case "created_by":
      return property.created_by;

    case "last_edited_time":
      return property.last_edited_time;

    case "last_edited_by":
      return property.last_edited_by;

    default:
      return property;
  }
}

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

  let requestBody: QueryDatabaseRequest = {};
  try {
    const body = await req.json();
    requestBody = body;
  } catch (error) {
    // If no body provided, use defaults
  }

  try {
    // First, get the database schema to understand property types
    const databaseResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!databaseResponse.ok) {
      const error = await databaseResponse.json();
      return NextResponse.json(
        {
          error: "Failed to fetch database schema",
          details: error,
        },
        { status: databaseResponse.status }
      );
    }

    const database = await databaseResponse.json();
    const propertyTypes: Record<string, string> = {};

    // Map property IDs to their types for later formatting
    Object.entries(database.properties).forEach(([key, property]: [string, any]) => {
      propertyTypes[property.id] = property.type;
      propertyTypes[key] = property.type; // Also map by name
    });

    // Query the database pages
    const queryBody: QueryDatabaseRequest = {
      page_size: requestBody.page_size || 100,
    };

    if (requestBody.filter) {
      queryBody.filter = requestBody.filter;
    }

    if (requestBody.sorts) {
      queryBody.sorts = requestBody.sorts;
    }

    if (requestBody.start_cursor) {
      queryBody.start_cursor = requestBody.start_cursor;
    }

    const pagesResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryBody),
      }
    );

    if (!pagesResponse.ok) {
      const error = await pagesResponse.json();
      return NextResponse.json(
        {
          error: "Failed to query database pages",
          details: error,
        },
        { status: pagesResponse.status }
      );
    }

    const pagesData = await pagesResponse.json();

    // Format the pages for easier consumption
    const formattedPages = pagesData.results.map((page: NotionPage) => {
      const formattedProperties: Record<string, any> = {};

      // Format each property based on its type
      Object.entries(page.properties).forEach(([key, property]: [string, any]) => {
        const propertyType = propertyTypes[key] || propertyTypes[property.id] || "unknown";
        formattedProperties[key] = {
          id: property.id,
          type: propertyType,
          value: formatPropertyValue(property, propertyType),
          raw: property, // Keep raw data for advanced use cases
        };
      });

      return {
        id: page.id,
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        archived: page.archived,
        icon: page.icon,
        cover: page.cover,
        properties: formattedProperties,
        parent_database_id: page.parent.database_id,
      };
    });

    return NextResponse.json({
      pages: formattedPages,
      has_more: pagesData.has_more,
      next_cursor: pagesData.next_cursor,
      total_count: formattedPages.length,
      database_id: databaseId,
      applied_filter: requestBody.filter || null,
      applied_sorts: requestBody.sorts || null,
    });
  } catch (error) {
    console.error("Error querying database pages:", error);
    return NextResponse.json(
      {
        error: "Internal server error while querying database pages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET method for simple queries without filters
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url);
  const pageSize = parseInt(url.searchParams.get("page_size") || "100");
  const startCursor = url.searchParams.get("start_cursor");

  // Create a simple POST request body
  const requestBody: QueryDatabaseRequest = {
    page_size: pageSize,
  };

  if (startCursor) {
    requestBody.start_cursor = startCursor;
  }

  // Convert GET to POST with empty filter
  const postRequest = new Request(req.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  return POST(postRequest, { params });
}
