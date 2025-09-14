/**
 * Centralized configuration for API URLs and backend endpoints
 * This ensures consistent use of environment variables across the frontend
 */

// Backend URL configuration
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8000";

// WebSocket URL configuration
export const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
  process.env.WEBSOCKET_URL ||
  BACKEND_URL.replace(/^http/, "ws");

// API configuration
export const API_CONFIG = {
  baseURL: BACKEND_URL,
  timeout: 10000,
  credentials: "include" as RequestCredentials,
} as const;

// Utility function to create backend URLs
export function createBackendURL(path: string): string {
  const baseUrl = BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// Utility function for API calls with consistent configuration
export function createAPIRequest(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(createBackendURL(path), {
    ...API_CONFIG,
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
