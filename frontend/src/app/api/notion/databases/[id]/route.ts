import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { id: databaseId } = await params;

  if (!databaseId) {
    return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        {
          error: "Failed to fetch database details",
          details: error,
        },
        { status: response.status }
      );
    }

    const database: NotionDatabaseDetails = await response.json();

    // Format the database schema for easier consumption
    const formattedProperties = Object.entries(database.properties).map(([key, property]) => ({
      id: property.id,
      name: property.name,
      type: property.type,
      key: key,
      // Include type-specific configuration
      ...(property.type === "select" &&
        property.select && {
          options: property.select.options,
        }),
      ...(property.type === "multi_select" &&
        property.multi_select && {
          options: property.multi_select.options,
        }),
      ...(property.type === "relation" &&
        property.relation && {
          database_id: property.relation.database_id,
          type: property.relation.type,
        }),
      ...(property.type === "formula" &&
        property.formula && {
          expression: property.formula.expression,
        }),
      ...(property.type === "rollup" &&
        property.rollup && {
          rollup_property_name: property.rollup.rollup_property_name,
          relation_property_name: property.rollup.relation_property_name,
          function: property.rollup.function,
        }),
    }));

    return NextResponse.json({
      id: database.id,
      title: database.title.map((t) => t.plain_text).join("") || "Untitled",
      properties: formattedProperties,
      url: database.url,
      created_time: database.created_time,
      last_edited_time: database.last_edited_time,
    });
  } catch (error) {
    console.error("Error fetching database details:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching database details",
      },
      { status: 500 }
    );
  }
}
