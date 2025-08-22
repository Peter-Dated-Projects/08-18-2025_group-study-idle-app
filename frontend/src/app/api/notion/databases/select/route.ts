import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NotionDatabaseData, addUserEnabledDatabase, UserEnabledDatabase } from "@/lib/firestore";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id, title } = body;

    if (!id || !title) {
      return NextResponse.json({ error: "Database ID and title are required" }, { status: 400 });
    }

    // Create database data object
    const selectedDatabase: NotionDatabaseData = {
      id,
      title,
    };

    // Add this database to user's enabled databases in Firestore
    const enabledDatabase: UserEnabledDatabase = {
      databaseId: id,
      databaseName: title,
    };

    await addUserEnabledDatabase(userId, enabledDatabase);
    console.log("✅ Database enabled for user:", title);

    return NextResponse.json({
      success: true,
      selectedDatabase,
      message: "Database enabled successfully",
    });
  } catch (error) {
    console.error("Error enabling database:", error);
    return NextResponse.json({ error: "Failed to enable database" }, { status: 500 });
  }
}
