import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateSelectedDatabase, getSelectedDatabase } from "@/lib/firestore";

const NOTION_SESSION_TOKEN_KEY = "notion_session_id";

// Set the selected database for tasks
export async function POST(req: Request) {
  const { databaseId, databaseTitle } = await req.json();

  if (!databaseId) {
    return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(NOTION_SESSION_TOKEN_KEY)?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  try {
    // Store the selected database in Firestore
    await updateSelectedDatabase(sessionId, databaseId, databaseTitle || "Selected Database");

    return NextResponse.json({
      success: true,
      message: "Database selected successfully",
      database: { id: databaseId, title: databaseTitle },
    });
  } catch (error) {
    console.error("Error selecting database:", error);
    return NextResponse.json({ error: "Failed to select database" }, { status: 500 });
  }
}

// Get the currently selected database
export async function GET() {
  // check if notion token stored in cookies
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(NOTION_SESSION_TOKEN_KEY)?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  try {
    const selectedDatabase = await getSelectedDatabase(sessionId);
    return NextResponse.json({ selectedDatabase });
  } catch (error) {
    console.error("Error getting selected database:", error);
    return NextResponse.json({ error: "Failed to get selected database" }, { status: 500 });
  }
}
