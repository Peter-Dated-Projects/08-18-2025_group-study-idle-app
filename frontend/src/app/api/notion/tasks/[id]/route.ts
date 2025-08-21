import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotionTokens } from "@/lib/firestore";

// Update a task (mainly for toggling completion status)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const taskId = params.id;
  const { completed } = await req.json();

  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "Completion status must be a boolean" }, { status: 400 });
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
    // First, get the page to understand its properties
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!pageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
    }

    const page = await pageResponse.json();
    const properties = page.properties;

    // Find the checkbox property
    let checkboxPropertyName = "";
    Object.entries(properties).forEach(([name, property]: [string, any]) => {
      if (property.type === "checkbox" && !checkboxPropertyName) {
        checkboxPropertyName = name;
      }
    });

    if (!checkboxPropertyName) {
      return NextResponse.json(
        { error: "No checkbox property found in this task" },
        { status: 400 }
      );
    }

    // Update the page
    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          [checkboxPropertyName]: {
            checkbox: completed,
          },
        },
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      return NextResponse.json(
        { error: "Failed to update task", details: error },
        { status: updateResponse.status }
      );
    }

    const updatedPage = await updateResponse.json();

    // Format the updated task
    let title = "Untitled Task";
    const titleProperty = Object.values(updatedPage.properties).find(
      (prop: any) => prop.type === "title"
    ) as any;
    if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
      title = titleProperty.title[0].plain_text;
    }

    const formattedTask = {
      id: updatedPage.id,
      title,
      completed,
      notionUrl: updatedPage.url,
      createdTime: updatedPage.created_time,
      lastEditedTime: updatedPage.last_edited_time,
    };

    return NextResponse.json({ task: formattedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
