import { getUserSession, updateUserSession, simpleEncrypt, simpleDecrypt } from "./firestore";

interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      object: string;
      id: string;
      name?: string;
      avatar_url?: string;
      type?: string;
      person?: any;
    };
  };
  duplicated_template_id?: string;
  request_id: string;
}

/**
 * Automatically refresh Notion access token when it expires
 * @param userId - The user ID
 * @returns Promise<string | null> - New access token or null if refresh failed
 */
export async function refreshNotionToken(userId: string): Promise<string | null> {
  try {
    console.log(`🔄 Attempting to refresh Notion token for user: ${userId}`);

    const session = await getUserSession(userId);
    if (!session || !session.notionTokens?.refresh_token) {
      console.error("❌ No session or refresh token available");
      return null;
    }

    const decryptedRefreshToken = simpleDecrypt(session.notionTokens.refresh_token);

    const response = await fetch("https://api.notion.com/v1/oauth/token", {
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
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
      }),
    });

    if (!response.ok) {
      console.error("❌ Token refresh failed:", await response.text());
      return null;
    }

    const newTokenData: TokenRefreshResponse = await response.json();

    // Update session with new access token (keep existing refresh token)
    const updatedSession = {
      ...session,
      notionTokens: {
        ...session.notionTokens,
        access_token: simpleEncrypt(newTokenData.access_token),
        // Keep existing refresh token encrypted
        refresh_token: session.notionTokens.refresh_token,
        workspace_id: newTokenData.workspace_id,
        workspace_name: newTokenData.workspace_name,
        bot_id: newTokenData.bot_id,
        refreshed_at: new Date().toISOString(),
      },
    };

    await updateUserSession(userId, updatedSession);

    console.log("✅ Notion token refreshed successfully");
    return newTokenData.access_token;
  } catch (error) {
    console.error("❌ Error refreshing Notion token:", error);
    return null;
  }
}

/**
 * Make a Notion API request with automatic token refresh on 401 errors
 * @param userId - The user ID
 * @param url - The API URL
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retry attempts (default: 1)
 * @returns Promise<Response> - The fetch response
 */
export async function fetchWithTokenRefresh(
  userId: string,
  url: string,
  options: RequestInit,
  maxRetries: number = 1
): Promise<Response> {
  const session = await getUserSession(userId);
  if (!session?.notionTokens?.access_token) {
    throw new Error("No Notion access token available");
  }

  // Decrypt token for first attempt
  let accessToken = simpleDecrypt(session.notionTokens.access_token);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Add authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If request succeeds, return the response
    if (response.ok) {
      return response;
    }

    // If it's a 401 unauthorized error and we have retries left, try to refresh token
    if (response.status === 401 && attempt < maxRetries) {
      console.log(
        `🔄 Got 401 error, attempting token refresh (attempt ${attempt + 1}/${maxRetries + 1})`
      );

      const newToken = await refreshNotionToken(userId);
      if (newToken) {
        accessToken = newToken;
        console.log("✅ Token refreshed, retrying request");
        continue; // Retry with new token
      } else {
        console.error("❌ Token refresh failed, giving up");
        break; // Stop retrying if refresh failed
      }
    }

    // Return the response (either non-401 error or final 401 after retry)
    return response;
  }

  // This shouldn't be reached, but just in case
  throw new Error("Unexpected error in fetchWithTokenRefresh");
}
