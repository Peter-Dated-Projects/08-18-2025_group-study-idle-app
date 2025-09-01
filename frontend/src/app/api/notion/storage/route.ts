import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotionTokens, getUserSessionDatabaseId, updateUserNotionTokens } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

interface NotionDatabaseDetails {
  id: string;
  title: Array<{
    plain_text: string;
  }>;
  properties: Record<string, NotionProperty>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

/**
 * Handles GET requests to retrieve database details.
 * @param _req The incoming request object (unused).
 * @returns A NextResponse object containing the database details or an error message.
 */
export async function GET(_req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    console.warn("/api/notion/storage: User not authenticated");
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  // Grab session_database_id from firestore
  const session_database_id = await getUserSessionDatabaseId(userId);
  if (!session_database_id) {
    console.warn("/api/notion/storage: User session database ID not found");
    return NextResponse.json(
      { error: "Session database not found. Please reconnect your Notion account." },
      { status: 404 }
    );
  }

  // Attempt to fetch database details
  try {
    const response = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${session_database_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.warn(`/api/notion/storage: Failed to fetch database details:`, error);
      return NextResponse.json(
        {
          error: "Failed to fetch database details",
          details: error,
        },
        { status: response.status }
      );
    }

    const database: NotionDatabaseDetails = await response.json();

    if (!database) {
      return NextResponse.json({ error: "Failed to fetch database details" }, { status: 500 });
    }

    // Format the database schema for easier consumption
    const formattedProperties = Object.entries(database.properties).map(([key, property]) => {
      const prop = property as Record<string, unknown> & { id: string; name: string; type: string };
      const result: Record<string, unknown> = {
        id: prop.id,
        name: prop.name,
        type: prop.type,
        key: key,
      };

      // Include type-specific configuration
      if (prop.type === "select" && prop.select) {
        const selectProp = prop.select as { options: unknown };
        result.options = selectProp.options;
      }

      if (prop.type === "multi_select" && prop.multi_select) {
        const multiSelectProp = prop.multi_select as { options: unknown };
        result.options = multiSelectProp.options;
      }

      if (prop.type === "relation" && prop.relation) {
        const relationProp = prop.relation as { database_id: string; type: string };
        result.database_id = relationProp.database_id;
        result.relation_type = relationProp.type;
      }

      if (prop.type === "formula" && prop.formula) {
        const formulaProp = prop.formula as { expression: string };
        result.expression = formulaProp.expression;
      }

      if (prop.type === "rollup" && prop.rollup) {
        const rollupProp = prop.rollup as {
          rollup_property_name: string;
          relation_property_name: string;
          function: string;
        };
        result.rollup_property_name = rollupProp.rollup_property_name;
        result.relation_property_name = rollupProp.relation_property_name;
        result.function = rollupProp.function;
      }

      return result;
    });

    return NextResponse.json({
      id: database.id,
      title: database.title.map((t) => t.plain_text).join("") || "Untitled",
      properties: formattedProperties,
      url: database.url,
      created_time: database.created_time,
      last_edited_time: database.last_edited_time,
    });
  } catch (error) {
    console.error(`Error fetching database details for ${session_database_id}:`, error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching database details",
        databaseId: session_database_id,
      },
      { status: 500 }
    );
  }
}
