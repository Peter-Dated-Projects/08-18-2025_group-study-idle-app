import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("notion_token")?.value;

  if (!tokenCookie) {
    return NextResponse.json({
      authenticated: false,
      error: "No authentication token found",
    });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenCookie);
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: "Invalid token data",
    });
  }

  const { access_token, workspace_id, workspace_name, bot_id } = tokenData;

  if (!access_token || !workspace_id) {
    return NextResponse.json({
      authenticated: false,
      error: "Incomplete token data",
    });
  }

  return NextResponse.json({
    authenticated: true,
    workspace_id,
    workspace_name,
    bot_id,
    has_refresh_token: !!tokenData.refresh_token,
  });
}

export async function DELETE() {
  // Logout endpoint - clear the stored token
  const cookieStore = await cookies();
  cookieStore.delete("notion_token");

  return NextResponse.json({
    success: true,
    message: "Successfully logged out",
  });
}
