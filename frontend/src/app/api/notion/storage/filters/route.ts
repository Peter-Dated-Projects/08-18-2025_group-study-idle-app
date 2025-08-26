import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, simpleDecrypt } from "@/lib/firestore";

interface FilterOption {
  property: string;
  propertyName: string;
  propertyType: string;
  filterTypes: string[];
  options?: Array<{ id: string; name: string; color: string }>;
  relationDatabaseId?: string;
}

interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

interface NotionDatabase {
  id: string;
  title: Array<{ plain_text: string }>;
  properties: Record<string, NotionProperty>;
}

// Map property types to their available filter operations
const getFilterTypesForProperty = (propertyType: string): string[] => {
  switch (propertyType) {
    case "title":
    case "rich_text":
    case "url":
    case "email":
    case "phone_number":
      return [
        "equals",
        "does_not_equal",
        "contains",
        "does_not_contain",
        "starts_with",
        "ends_with",
        "is_empty",
        "is_not_empty",
      ];

    case "number":
      return [
        "equals",
        "does_not_equal",
        "greater_than",
        "less_than",
        "greater_than_or_equal_to",
        "less_than_or_equal_to",
        "is_empty",
        "is_not_empty",
      ];

    case "select":
      return ["equals", "does_not_equal", "is_empty", "is_not_empty"];

    case "multi_select":
      return ["contains", "does_not_contain", "is_empty", "is_not_empty"];

    case "date":
      return [
        "equals",
        "before",
        "after",
        "on_or_before",
        "on_or_after",
        "past_week",
        "past_month",
        "past_year",
        "next_week",
        "next_month",
        "next_year",
        "is_empty",
        "is_not_empty",
      ];

    case "people":
      return ["contains", "does_not_contain", "is_empty", "is_not_empty"];

    case "files":
      return ["is_empty", "is_not_empty"];

    case "checkbox":
      return ["equals", "does_not_equal"];

    case "relation":
      return ["contains", "does_not_contain", "is_empty", "is_not_empty"];

    case "formula":
      return [
        "equals",
        "does_not_equal",
        "contains",
        "does_not_contain",
        "starts_with",
        "ends_with",
        "greater_than",
        "less_than",
        "is_empty",
        "is_not_empty",
      ];

    case "rollup":
      return [
        "equals",
        "does_not_equal",
        "contains",
        "does_not_contain",
        "is_empty",
        "is_not_empty",
      ];

    case "created_time":
    case "last_edited_time":
      return [
        "equals",
        "before",
        "after",
        "on_or_before",
        "on_or_after",
        "past_week",
        "past_month",
        "past_year",
        "next_week",
        "next_month",
        "next_year",
      ];

    case "created_by":
    case "last_edited_by":
      return ["contains", "does_not_contain"];

    default:
      return ["equals", "does_not_equal"];
  }
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    // Decrypt the access token
    const accessToken = simpleDecrypt(session.notionTokens.access_token);

    // Await params in Next.js 15
    const { id: databaseId } = await params;

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
    }

    // Fetch the database schema
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        {
          error: "Failed to fetch database schema",
          details: error,
        },
        { status: response.status }
      );
    }

    const database: NotionDatabase = await response.json();

    // Generate filter options for each property
    const filterOptions: FilterOption[] = Object.entries(database.properties).map(
      ([key, property]) => {
        const baseFilter: FilterOption = {
          property: key,
          propertyName: property.name || key,
          propertyType: property.type,
          filterTypes: getFilterTypesForProperty(property.type),
        };

        // Add specific options for select and multi_select properties
        if (property.type === "select" && property.select?.options) {
          baseFilter.options = property.select.options.map((option: any) => ({
            id: option.id,
            name: option.name,
            color: option.color,
          }));
        }

        if (property.type === "multi_select" && property.multi_select?.options) {
          baseFilter.options = property.multi_select.options.map((option: any) => ({
            id: option.id,
            name: option.name,
            color: option.color,
          }));
        }

        // Add relation database info
        if (property.type === "relation" && property.relation?.database_id) {
          baseFilter.relationDatabaseId = property.relation.database_id;
        }

        return baseFilter;
      }
    );

    // Also provide some pre-built common filter combinations
    const commonFilters = {
      // Checkbox filters (assuming common property names)
      completed: filterOptions.find(
        (f) =>
          f.propertyType === "checkbox" &&
          (f.propertyName.toLowerCase().includes("done") ||
            f.propertyName.toLowerCase().includes("complete") ||
            f.propertyName.toLowerCase().includes("finished"))
      ),

      // Date filters
      dueDate: filterOptions.find(
        (f) =>
          f.propertyType === "date" &&
          (f.propertyName.toLowerCase().includes("due") ||
            f.propertyName.toLowerCase().includes("deadline"))
      ),

      // Status filters
      status: filterOptions.find(
        (f) => f.propertyType === "select" && f.propertyName.toLowerCase().includes("status")
      ),

      // Priority filters
      priority: filterOptions.find(
        (f) =>
          (f.propertyType === "select" || f.propertyType === "multi_select") &&
          f.propertyName.toLowerCase().includes("priority")
      ),
    };

    return NextResponse.json({
      databaseId,
      databaseTitle: database.title.map((t) => t.plain_text).join("") || "Untitled",
      properties: filterOptions,
      commonFilters,
      // Sample filter examples
      examples: {
        completedTasks: {
          property: commonFilters.completed?.property,
          checkbox: { equals: true },
        },
        incompleteTasks: {
          property: commonFilters.completed?.property,
          checkbox: { equals: false },
        },
        dueSoon: {
          property: commonFilters.dueDate?.property,
          date: { next_week: {} },
        },
        highPriority: {
          property: commonFilters.priority?.property,
          select: { equals: "High" }, // You'd need to adjust this based on actual options
        },
      },
    });
  } catch (error) {
    console.error("Error retrieving database filters:", error);
    return NextResponse.json({ error: "Failed to retrieve database filters" }, { status: 500 });
  }
}
