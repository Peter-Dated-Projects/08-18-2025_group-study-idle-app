import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { storeUserSession, simpleEncrypt, UserSession } from "@/lib/firestore";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      const errorDescription = url.searchParams.get("error_description");
      return NextResponse.redirect(
        `${url.origin}/?error=${encodeURIComponent(
          error + (errorDescription ? `: ${errorDescription}` : "")
        )}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(`${url.origin}/?error=Missing code or state parameter`);
    }

    // Verify CSRF state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;
    const returnUrl = cookieStore.get("google_return_url")?.value || url.origin;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${url.origin}/?error=Invalid state parameter`);
    }

    // Clear the cookies
    cookieStore.delete("google_oauth_state");
    cookieStore.delete("google_return_url");

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${url.origin}/api/gauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      return NextResponse.redirect(`${url.origin}/?error=Failed to exchange authorization code`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to get user info");
      return NextResponse.redirect(`${url.origin}/?error=Failed to get user information`);
    }

    const userInfo = await userResponse.json();

    if (!userInfo.email) {
      return NextResponse.redirect(`${url.origin}/?error=No email found in Google account`);
    }

    // Create a session ID
    const sessionId = crypto.randomUUID();

    // Store user session
    const userSessionInfo: UserSession = {
      sessionId,
      userId: simpleEncrypt(userInfo.email), // generate userID based off encrypted version of user email
      notionTokens: null,
      selectedDatabase: null,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      userAccountInformation: {
        userId: simpleEncrypt(userInfo.email),
        email: userInfo.email,
        userName: userInfo.name || userInfo.email.split("@")[0], // Use name if available, else email prefix
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
    await storeUserSession(userSessionInfo);

    // Set a session cookie for the frontend
    cookieStore.set("user_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Store encrypted email for quick re-authentication check
    const encryptedEmail = simpleEncrypt(userInfo.email);
    cookieStore.set("user_id", encryptedEmail, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log(`User authenticated: ${userInfo.email} with session: ${sessionId}`);

    // Redirect back to the original page with success
    return NextResponse.redirect(`${returnUrl}?auth=success`);
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    const url = new URL(req.url);
    return NextResponse.redirect(`${url.origin}/?error=Authentication failed`);
  }
}
