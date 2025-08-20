import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (!state) return NextResponse.json({ error: "Missing state parameter" }, { status: 400 });

  // Verify CSRF state parameter
  const cookieStore = await cookies();
  const storedState = cookieStore.get("notion_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  // Clear the state cookie
  cookieStore.delete("notion_oauth_state");

  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.NOTION_CLIENT_ID! + ":" + process.env.NOTION_CLIENT_SECRET!
        ).toString("base64"),
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI!,
    }),
  });

  const tok = await res.json();
  if (!res.ok) return NextResponse.json(tok, { status: 400 });

  // Store token securely (in production, use proper database/session storage)
  const tokenCookie = {
    access_token: tok.access_token,
    workspace_id: tok.workspace_id,
    workspace_name: tok.workspace_name,
    bot_id: tok.bot_id,
    ...(tok.refresh_token && { refresh_token: tok.refresh_token }),
  };

  cookieStore.set("notion_token", JSON.stringify(tokenCookie), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400, // 24 hours
  });

  return NextResponse.redirect(`/notion/select-database?workspace=${tok.workspace_id}`);
}
