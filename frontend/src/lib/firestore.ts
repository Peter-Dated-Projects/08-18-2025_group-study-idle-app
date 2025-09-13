import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

// Use collection names directly - no need for database name in most cases
export const FIRESTORE_USER_SESSIONS = process.env.FIRESTORE_USER_SESSIONS;
export const FIRESTORE_NOTION_TOKENS = process.env.FIRESTORE_NOTION_TOKENS;
export const FIRESTORE_DATABASE_NAME = process.env.FIRESTORE_DATABASE_NAME;
const FIRESTORE_SERVICE_ACCOUNT_JSON = process.env.FIRESTORE_SERVICE_ACCOUNT_JSON;

// Initialize Firebase Admin if not already initialized
export function getFirestoreDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(FIRESTORE_SERVICE_ACCOUNT_JSON!);

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
  return getFirestore(FIRESTORE_DATABASE_NAME!);
}

// Encryption utilities
const ENCRYPTION_KEY = process.env.NOTION_TOKEN_ENCRYPTION_KEY!.replace(/"/g, ""); // Remove quotes

// Derive key using SHA-256 for key derivation
function deriveKey(password: string, salt: Buffer = Buffer.alloc(0)): Buffer {
  // Use SHA-256 for key derivation
  const keyLength = 32; // 256 bits for AES-256
  let derivedKey = Buffer.alloc(0);
  let hash: Buffer = Buffer.alloc(0);

  while (derivedKey.length < keyLength) {
    const dataToHash = Buffer.concat([hash, Buffer.from(password), salt]);
    hash = crypto.createHash("sha256").update(dataToHash).digest();
    derivedKey = Buffer.concat([derivedKey, hash]);
  }

  return derivedKey.subarray(0, keyLength);
}

const key = deriveKey(ENCRYPTION_KEY);

// Encryption functions using modern APIs
export function encryptToken(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

export function decryptToken(encryptedData: {
  encrypted: string;
  iv: string;
  tag: string;
}): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedData.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"));

  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Simplified encryption using fixed IV
const FIXED_IV = Buffer.from("0123456789abcdef0123456789abcdef", "hex"); // 16 bytes

export function simpleEncrypt(text: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, FIXED_IV);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function simpleDecrypt(encryptedText: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, FIXED_IV);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface NotionTokenData {
  access_token: string;
  session_database_id: string | null;
  duplicated_block_id: string;
  bot_id: string;
  refresh_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotionDatabaseData {
  id: string;
  title: string;
}
export interface UserSession {
  sessionId: string;
  userId: string;
  notionTokens: NotionTokenData | null;
  created_at: Date;
  expires_at: Date;
  userAccountInformation: UserAccountInformation | null;
}

export interface UserAccountInformation {
  userId: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  userName: string;
}

// Session API response type
export interface SessionApiResponse {
  success: boolean;
  userId: string;
  userEmail: string;
  userName: string | null; // Can be null if userAccountInformation is null
  sessionId: string;
  hasNotionTokens: boolean;
  error?: string;
}

// Cached session state type for frontend components
export interface CachedSessionState {
  userId: string;
  userEmail: string;
  userName: string | null;
  sessionId: string;
  hasNotionTokens: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastChecked: number; // Timestamp of last session check
}

// Generate a unique session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Store User Session IDs in Firestore
export async function storeUserSession(userSession: UserSession): Promise<void> {
  try {
    const db = getFirestoreDb();
    await db.collection(FIRESTORE_USER_SESSIONS!).doc(userSession.userId).set(userSession);
  } catch (error) {
    console.error("Error storing user session:", error);
    console.error("Collection name:", FIRESTORE_USER_SESSIONS);
    console.error("Session data:", userSession);
    throw error;
  }
}

// Store Notion tokens in Firestore
export async function storeNotionTokens(userID: string, tokenData: NotionTokenData): Promise<void> {
  const db = getFirestoreDb();

  // Encrypt sensitive data
  const encryptedTokenData = {
    ...tokenData,
    access_token: simpleEncrypt(tokenData.access_token),
    refresh_token: tokenData.refresh_token ? simpleEncrypt(tokenData.refresh_token) : undefined,
  };

  // Only update notionTokens and updated_at, do not change expires_at or created_at
  await db.collection(FIRESTORE_USER_SESSIONS!).doc(userID).set(
    {
      notionTokens: encryptedTokenData,
      updated_at: new Date(),
    },
    { merge: true }
  );
}

// Retrieve Notion tokens from Firestore
export async function getNotionTokens(sessionId: string): Promise<NotionTokenData | null> {
  const db = getFirestoreDb();

  const doc = await db.collection(FIRESTORE_USER_SESSIONS!).doc(sessionId).get();
  if (!doc.exists) {
    return null;
  }

  const userSession = doc.data() as UserSession;
  const encryptedTokens = userSession.notionTokens;

  // Decrypt sensitive data
  if (!encryptedTokens) {
    return null;
  }
  const decryptedTokens: NotionTokenData = {
    access_token: simpleDecrypt(encryptedTokens.access_token),
    session_database_id: encryptedTokens.session_database_id,
    duplicated_block_id: encryptedTokens.duplicated_block_id,
    bot_id: encryptedTokens.bot_id,
    refresh_token: encryptedTokens.refresh_token
      ? simpleDecrypt(encryptedTokens.refresh_token)
      : undefined,
    created_at: encryptedTokens.created_at,
    updated_at: encryptedTokens.updated_at,
  };

  return decryptedTokens;
}

// Get user session by sessionId
export async function getUserSession(userID: string): Promise<UserSession | null> {
  const db = getFirestoreDb();

  // Find session by sessionId across all user documents
  const snapshot = await db
    .collection(FIRESTORE_USER_SESSIONS!)
    .where("userId", "==", userID)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return doc.data() as UserSession;
}

// Update user session with new data (e.g., refreshed tokens)
export async function updateUserSession(
  userID: string,
  updatedSession: UserSession
): Promise<void> {
  const db = getFirestoreDb();

  const snapshot = await db
    .collection(FIRESTORE_USER_SESSIONS!)
    .where("userId", "==", userID)
    .get();

  if (snapshot.empty) {
    throw new Error("User session not found");
  }

  const doc = snapshot.docs[0];
  await doc.ref.update({
    ...updatedSession,
    updated_at: new Date().toISOString(),
  });
}

// Update user Notion Tokens
export async function updateUserNotionTokens(
  userId: string,
  tokenData: NotionTokenData
): Promise<void> {
  const db = getFirestoreDb();

  // Encrypt sensitive data
  const encryptedTokenData = {
    ...tokenData,
    access_token: simpleEncrypt(tokenData.access_token),
    refresh_token: tokenData.refresh_token ? simpleEncrypt(tokenData.refresh_token) : undefined,
  };

  await db.collection(FIRESTORE_USER_SESSIONS!).doc(userId).update({
    notionTokens: encryptedTokenData,
    updated_at: new Date(),
  });
}

// Clean up expired sessions (optional utility)
export async function cleanupExpiredSessions(maxAgeInDays: number = 30): Promise<number> {
  const db = getFirestoreDb();
  const cutoffDate = new Date(Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000);

  const expiredSessions = await db
    .collection(FIRESTORE_USER_SESSIONS!)
    .where("updated_at", "<", cutoffDate)
    .get();

  const batch = db.batch();
  expiredSessions.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return expiredSessions.size;
}

// Get session_database_id by user_id
export async function getUserSessionDatabaseId(userID: string): Promise<string | null> {
  const notionTokens = await getNotionTokens(userID);
  return notionTokens?.session_database_id || null;
}
