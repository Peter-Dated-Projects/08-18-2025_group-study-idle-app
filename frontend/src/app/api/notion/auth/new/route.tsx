import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  FIRESTORE_USER_SESSIONS,
  generateSessionId,
  getFirestoreDb,
  storeUserSession,
  UserSession,
} from "@/lib/firestore";

async function generateNewUserSession() {
  // create a new user session token
  // store session token in firestore db under user sessions with timer
  // creates 30 day valid tokens

  const sessionToken: UserSession = {
    sessionId: generateSessionId(),
    userId: "user_id",
    notionTokens: null,
    selectedDatabase: null,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };

  console.log("creating session: ", sessionToken);

  // store session token in firestore db under user sessions with timer
  await storeUserSession(sessionToken);
  return sessionToken;
}

/**
 * Checks if user has a valid Notion Token
 * @returns
 */
export async function GET() {}
