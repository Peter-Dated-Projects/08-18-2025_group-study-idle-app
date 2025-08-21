import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  FIRESTORE_USER_SESSIONS,
  generateSessionId,
  getFirestoreDb,
  storeUserSession,
  UserSession,
} from "@/lib/firestore";

/**
 * Checks if user has a valid Notion Token
 * @returns
 */
export async function GET() {
  // check if token stored in cookies
  const cookieStore = await cookies();
  const cookieSessionInfo = cookieStore.get(process.env.TOKEN_SESSION_INFO!)?.value;

  // confirm valid session information
  let hasValidSessionInfo = true;
  if (!cookieSessionInfo) hasValidSessionInfo = false;
  else {
    // the cookie exists, but data might not be valid
    const cookieJSON: UserSession = JSON.parse(cookieSessionInfo);

    // check -- valid session ID
    if (!cookieJSON?.sessionId || !cookieJSON.userId) hasValidSessionInfo = false;
    if (!cookieJSON?.notionTokens?.access_token) hasValidSessionInfo = false;

    // if all tokens exists, check if still valid
    const currentDate = new Date(Date.now());
    if (!cookieJSON?.expires_at || !cookieJSON?.created_at) hasValidSessionInfo = false;
    if (cookieJSON?.expires_at < currentDate) hasValidSessionInfo = false;
  }

  // if not valid session
  if (!hasValidSessionInfo) {
    // return a response
    return NextResponse.json(
      {
        authenticated: false,
        warning: "No valid authentication token found.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
    },
    { status: 200 }
  );
}
