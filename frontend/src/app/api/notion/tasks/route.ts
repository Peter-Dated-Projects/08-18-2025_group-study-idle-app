import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NOTION_API_VERSION } from "@/components/constants";
import { getUserSession, simpleDecrypt } from "@/lib/firestore";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

// Helper function to extract plain text from Notion rich text objects
const extractPlainText = (richTextArray: any): string => {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj: any) => textObj.plain_text || "").join("");
};

// Helper function to determine if a page represents a "task"
function isTaskPage(page: any, database: any): boolean {
  // Check if database has typical task properties
  const hasCheckbox = Object.values(database.properties).some(
    (prop: any) =>
      prop.type === "checkbox" &&
      (prop.name.toLowerCase().includes("completed") ||
        prop.name.toLowerCase().includes("done") ||
        prop.name.toLowerCase().includes("finished"))
  );

  const hasTitle = Object.values(database.properties).some((prop: any) => prop.type === "title");

  return hasCheckbox && hasTitle;
}

// Helper function to extract task-like properties from a page
function extractTaskProperties(page: any, database: any) {
  const properties = page.properties;
  const dbProperties = database.properties;

  let title = "";
  let completed = false;
  let status = null;
  let dueDate = null;
  let priority = null;
  let assignee = null;

  // Find title property
  const titleProp = Object.entries(dbProperties).find(
    ([key, prop]: [string, any]) => prop.type === "title"
  );
  if (titleProp && properties[titleProp[0]]) {
    title = extractPlainText(properties[titleProp[0]].title);
  }

  // Find completion checkbox
  const completedProp = Object.entries(dbProperties).find(
    ([key, prop]: [string, any]) =>
      prop.type === "checkbox" &&
      (prop.name.toLowerCase().includes("completed") ||
        prop.name.toLowerCase().includes("done") ||
        prop.name.toLowerCase().includes("finished"))
  );
  if (completedProp && properties[completedProp[0]]) {
    completed = properties[completedProp[0]].checkbox || false;
  }

  // Find status property
  const statusProp = Object.entries(dbProperties).find(
    ([key, prop]: [string, any]) =>
      prop.type === "select" && prop.name.toLowerCase().includes("status")
  );
  if (statusProp && properties[statusProp[0]]) {
    status = properties[statusProp[0]].select?.name || null;
  }

  // Find due date property
  const dueProp = Object.entries(dbProperties).find(
    ([key, prop]: [string, any]) =>
      prop.type === "date" &&
      (prop.name.toLowerCase().includes("due") || prop.name.toLowerCase().includes("deadline"))
  );
  if (dueProp && properties[dueProp[0]]) {
    dueDate = properties[dueProp[0]].date?.start || null;
  }

  // Find priority property
  const priorityProp = Object.entries(dbProperties).find(
    ([key, prop]: [string, any]) =>
      prop.type === "select" && prop.name.toLowerCase().includes("priority")
  );
  if (priorityProp && properties[priorityProp[0]]) {
    priority = properties[priorityProp[0]].select?.name || null;
  }

  // Find assignee property
  const assigneeProp = Object.entries(dbProperties).find(
    ([key, prop]: [string, any]) =>
      prop.type === "people" &&
      (prop.name.toLowerCase().includes("assignee") ||
        prop.name.toLowerCase().includes("assigned") ||
        prop.name.toLowerCase().includes("owner"))
  );
  if (assigneeProp && properties[assigneeProp[0]]) {
    assignee = properties[assigneeProp[0]].people?.[0] || null;
  }

  return {
    title,
    completed,
    status,
    dueDate,
    priority,
    assignee,
  };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated", needsReauth: true }, { status: 401 });
    }

    // Get user session from Firestore
    const session = await getUserSession(userId);
    if (!session) {
      return NextResponse.json({ error: "Invalid session", needsReauth: true }, { status: 401 });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date(Date.now())) {
      return NextResponse.json({ error: "Session expired", needsReauth: true }, { status: 401 });
    }

    // Check if we have Notion tokens
    if (!session.notionTokens?.access_token) {
      return NextResponse.json(
        { error: "Notion access token expired. Please reconnect to Notion.", needsReauth: true },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const databaseId = url.searchParams.get("databaseId");
    const filterParam = url.searchParams.get("filter");

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
    }

    // Parse filter if provided
    let filter = null;
    if (filterParam) {
      try {
        filter = JSON.parse(decodeURIComponent(filterParam));
      } catch (error) {
        return NextResponse.json({ error: "Invalid filter format" }, { status: 400 });
      }
    }

    // Get database schema first
    const databaseResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
      }
    );

    if (!databaseResponse.ok) {
      const error = await databaseResponse.json();

      console.log("/api/notion/tasks:", error);
      if (error.code === "unauthorized") {
        return NextResponse.json(
          {
            error: "Access denied to database",
            needsReauth: true,
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to fetch database",
          details: error,
        },
        { status: databaseResponse.status }
      );
    }

    const database = await databaseResponse.json();

    // Query database pages
    const queryBody: any = {
      page_size: 100,
    };

    if (filter) {
      queryBody.filter = filter;
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

      console.log("/api/notion/tasks:", error);
      if (error.code === "unauthorized") {
        return NextResponse.json(
          {
            error: "Access denied to database",
            needsReauth: true,
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to query database",
          details: error,
        },
        { status: pagesResponse.status }
      );
    }

    const pagesData = await pagesResponse.json();

    // Check if this looks like a task database
    // console.log("/api/notion/tasks received pages from database: ", pagesData);
    const isTaskDatabase = isTaskPage({}, database);

    if (isTaskDatabase) {
      // Format as tasks
      const tasks = pagesData.results.map((page: any) => {
        const taskProps = extractTaskProperties(page, database);

        return {
          id: page.id,
          title: taskProps.title || "Untitled",
          completed: taskProps.completed,
          status: taskProps.status,
          dueDate: taskProps.dueDate,
          priority: taskProps.priority,
          assignee: taskProps.assignee,
          notionUrl: page.url,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          archived: page.archived,
        };
      });

      return NextResponse.json({
        tasks,
        total_count: tasks.length,
        database_id: databaseId,
        is_task_database: true,
        applied_filter: filter,
      });
    } else {
      // Format as generic pages
      const pages = pagesData.results.map((page: any) => {
        // Extract title from any title property
        const titleProp = Object.entries(database.properties).find(
          ([key, prop]: [string, any]) => prop.type === "title"
        );

        let title = "Untitled";
        if (titleProp && page.properties[titleProp[0]]) {
          title = extractPlainText(page.properties[titleProp[0]].title) || "Untitled";
        }

        return {
          id: page.id,
          title,
          properties: page.properties,
          notionUrl: page.url,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          archived: page.archived,
          icon: page.icon,
          cover: page.cover,
        };
      });

      return NextResponse.json({
        pages,
        total_count: pages.length,
        database_id: databaseId,
        is_task_database: false,
        applied_filter: filter,
      });
    }
  } catch (error) {
    console.error("Error fetching tasks/pages:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated", needsReauth: true }, { status: 401 });
    }

    // Get user session from Firestore
    const session = await getUserSession(userId);
    if (!session) {
      return NextResponse.json({ error: "Invalid session", needsReauth: true }, { status: 401 });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date(Date.now())) {
      return NextResponse.json({ error: "Session expired", needsReauth: true }, { status: 401 });
    }

    // Check if we have Notion tokens
    if (!session.notionTokens?.access_token) {
      return NextResponse.json(
        { error: "Notion access token expired. Please reconnect to Notion.", needsReauth: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { database_id, filter, sort, page_size = 100, start_cursor } = body;

    if (!database_id) {
      return NextResponse.json({ error: "database_id is required" }, { status: 400 });
    }

    // Get database info
    const databaseResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${database_id}`,
      {
        method: "GET",
      }
    );

    if (!databaseResponse.ok) {
      const error = await databaseResponse.json();
      if (error.code === "unauthorized") {
        return NextResponse.json(
          {
            error: "Access denied to database",
            needsReauth: true,
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to fetch database",
          details: error,
        },
        { status: databaseResponse.status }
      );
    }

    const database = await databaseResponse.json();

    // Build query body
    const queryBody: any = {
      page_size: Math.min(page_size, 100),
    };

    if (filter) {
      queryBody.filter = filter;
    }

    if (sort) {
      queryBody.sorts = Array.isArray(sort) ? sort : [sort];
    }

    if (start_cursor) {
      queryBody.start_cursor = start_cursor;
    }

    // Query database pages
    const pagesResponse = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${database_id}/query`,
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
      if (error.code === "unauthorized") {
        return NextResponse.json(
          {
            error: "Access denied to database",
            needsReauth: true,
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to query database",
          details: error,
        },
        { status: pagesResponse.status }
      );
    }

    const pagesData = await pagesResponse.json();

    // Check if this looks like a task database
    const isTaskDatabase = isTaskPage({}, database);

    if (isTaskDatabase) {
      // Format as tasks
      const tasks = pagesData.results.map((page: any) => {
        const taskProps = extractTaskProperties(page, database);

        return {
          id: page.id,
          title: taskProps.title || "Untitled",
          completed: taskProps.completed,
          status: taskProps.status,
          dueDate: taskProps.dueDate,
          priority: taskProps.priority,
          assignee: taskProps.assignee,
          notionUrl: page.url,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          archived: page.archived,
        };
      });

      return NextResponse.json({
        tasks,
        total_count: tasks.length,
        database_id: database_id,
        is_task_database: true,
        applied_filter: filter,
        applied_sort: sort,
        has_more: pagesData.has_more,
        next_cursor: pagesData.next_cursor,
      });
    } else {
      // Format as generic pages
      const pages = pagesData.results.map((page: any) => {
        // Extract title from any title property
        const titleProp = Object.entries(database.properties).find(
          ([key, prop]: [string, any]) => prop.type === "title"
        );

        let title = "Untitled";
        if (titleProp && page.properties[titleProp[0]]) {
          title = extractPlainText(page.properties[titleProp[0]].title) || "Untitled";
        }

        return {
          id: page.id,
          title,
          properties: page.properties,
          notionUrl: page.url,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          archived: page.archived,
          icon: page.icon,
          cover: page.cover,
        };
      });

      return NextResponse.json({
        pages,
        total_count: pages.length,
        database_id: database_id,
        is_task_database: false,
        applied_filter: filter,
        applied_sort: sort,
        has_more: pagesData.has_more,
        next_cursor: pagesData.next_cursor,
      });
    }
  } catch (error) {
    console.error("Error fetching filtered tasks/pages:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching filtered tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
