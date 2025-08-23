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
const ALGORITHM = "aes-256-gcm";

export function encryptToken(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"));

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Note: For GCM mode, we'd need to handle auth tag differently
  // For simplicity, using a basic encryption approach
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: "", // Would contain auth tag for GCM
  };
}

export function decryptToken(encryptedData: {
  encrypted: string;
  iv: string;
  tag: string;
}): string {
  const decipher = crypto.createDecipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"));

  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Simplified encryption for now
export function simpleEncrypt(text: string): string {
  const cipher = crypto.createCipher("aes-256-cbc", ENCRYPTION_KEY);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function simpleDecrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher("aes-256-cbc", ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface NotionTokenData {
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  bot_id: string;
  refresh_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotionDatabaseData {
  id: string;
  title: string;
}

export interface UserEnabledDatabase {
  databaseName: string;
  databaseId: string;
}

export interface UserEnabledDatabases {
  databases: UserEnabledDatabase[];
  updated_at: Date;
}

export interface UserAccountInformation {
  userId: string;
  email: string;
  created_at: Date;
  updated_at: Date;

  userName: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  notionTokens: NotionTokenData | null;
  created_at: Date;
  expires_at: Date;
  userAccountInformation: UserAccountInformation | null;
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
    workspace_id: encryptedTokens.workspace_id,
    workspace_name: encryptedTokens.workspace_name,
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

// User-enabled databases management
export async function storeUserEnabledDatabases(
  userId: string,
  databases: UserEnabledDatabase[]
): Promise<void> {
  const db = getFirestoreDb();

  const userEnabledDbs: UserEnabledDatabases = {
    databases,
    updated_at: new Date(),
  };

  await db.collection("user_notion_enabled_dbs").doc(userId).set(userEnabledDbs);
}

export async function getUserEnabledDatabases(userId: string): Promise<UserEnabledDatabase[]> {
  const db = getFirestoreDb();

  const doc = await db.collection("user_notion_enabled_dbs").doc(userId).get();

  if (!doc.exists) {
    console.log("🔥 No enabled databases found for user");
    return [];
  }

  const data = doc.data() as UserEnabledDatabases;
  return data.databases || [];
}

export async function addUserEnabledDatabase(
  userId: string,
  database: UserEnabledDatabase
): Promise<void> {
  const existingDatabases = await getUserEnabledDatabases(userId);

  // Check if database already exists
  const exists = existingDatabases.some((db) => db.databaseId === database.databaseId);
  if (exists) {
    console.log("🔥 Database already exists, skipping");
    return; // Already exists, no need to add
  }

  const updatedDatabases = [...existingDatabases, database];

  await storeUserEnabledDatabases(userId, updatedDatabases);
}
