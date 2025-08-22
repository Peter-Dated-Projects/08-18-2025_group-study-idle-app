import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: databaseId } = await params;

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
    }

    // Check authentication
    const sessionResponse = await fetch(new URL("/api/notion/session", request.url).toString(), {
      method: "GET",
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: "Not authenticated", needsReauth: true }, { status: 401 });
    }

    // Forward to the main tasks API
    const tasksResponse = await fetch(new URL("/api/notion/tasks", request.url).toString(), {
      method: "GET",
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (!tasksResponse.ok) {
      const error = await tasksResponse.json();
      return NextResponse.json(error, { status: tasksResponse.status });
    }

    const data = await tasksResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tasks by ID:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: databaseId } = await params;
    const body = await request.json();

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
    }

    // Add database_id to the body
    const requestBody = {
      ...body,
      database_id: databaseId,
    };

    // Forward to the main tasks API
    const tasksResponse = await fetch(new URL("/api/notion/tasks", request.url).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") || "",
      },
      body: JSON.stringify(requestBody),
    });

    if (!tasksResponse.ok) {
      const error = await tasksResponse.json();
      return NextResponse.json(error, { status: tasksResponse.status });
    }

    const data = await tasksResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching filtered tasks by ID:", error);
    return NextResponse.json(
      {
        error: "Internal server error while fetching filtered tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
