import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotionTokens } from "@/lib/firestore";

// Get tasks from a specific Notion database
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const databaseId = searchParams.get("databaseId");

  if (!databaseId) {
    return NextResponse.json({ error: "Database ID required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("notion_session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  // Get tokens from Firestore
  const tokenData = await getNotionTokens(sessionId);

  if (!tokenData) {
    return NextResponse.json({ error: "No authentication token found" }, { status: 401 });
  }

  const { access_token } = tokenData;

  try {
    // Query the database for tasks
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        sorts: [
          {
            property: "created_time",
            direction: "descending",
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: "Failed to fetch tasks", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Format tasks for our application
    const formattedTasks = data.results.map((page: any) => {
      const properties = page.properties;

      // Try to find title property (could be "Name", "Title", or first title property)
      let title = "Untitled Task";
      const titleProperty = Object.values(properties).find(
        (prop: any) => prop.type === "title"
      ) as any;
      if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
        title = titleProperty.title[0].plain_text;
      }

      // Try to find checkbox property for completion status
      let completed = false;
      const checkboxProperty = Object.values(properties).find(
        (prop: any) => prop.type === "checkbox"
      ) as any;
      if (checkboxProperty) {
        completed = checkboxProperty.checkbox;
      }

      return {
        id: page.id,
        title,
        completed,
        notionUrl: page.url,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    });

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new task in Notion database
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const databaseId = searchParams.get("databaseId");

  if (!databaseId) {
    return NextResponse.json({ error: "Database ID required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("notion_session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  // Get tokens from Firestore
  const tokenData = await getNotionTokens(sessionId);

  if (!tokenData) {
    return NextResponse.json({ error: "No authentication token found" }, { status: 401 });
  }

  const { access_token } = tokenData;
  const { title } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  try {
    // First, get the database schema to understand its properties
    const schemaResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!schemaResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch database schema" }, { status: 500 });
    }

    const schema = await schemaResponse.json();
    const properties = schema.properties;

    // Find the title property and checkbox property
    let titlePropertyName = "";
    let checkboxPropertyName = "";

    Object.entries(properties).forEach(([name, property]: [string, any]) => {
      if (property.type === "title" && !titlePropertyName) {
        titlePropertyName = name;
      }
      if (property.type === "checkbox" && !checkboxPropertyName) {
        checkboxPropertyName = name;
      }
    });

    // Build the properties object for the new page
    const pageProperties: any = {};

    if (titlePropertyName) {
      pageProperties[titlePropertyName] = {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      };
    }

    if (checkboxPropertyName) {
      pageProperties[checkboxPropertyName] = {
        checkbox: false,
      };
    }

    // Create the page in Notion
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId,
        },
        properties: pageProperties,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: "Failed to create task", details: error },
        { status: response.status }
      );
    }

    const newPage = await response.json();

    // Return the formatted task
    const formattedTask = {
      id: newPage.id,
      title,
      completed: false,
      notionUrl: newPage.url,
      createdTime: newPage.created_time,
      lastEditedTime: newPage.last_edited_time,
    };

    return NextResponse.json({ task: formattedTask });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
