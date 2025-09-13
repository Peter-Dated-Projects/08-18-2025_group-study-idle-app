import { APIResponse } from "./types";

export class APIError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = "APIError";
  }
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.message || `HTTP error! status: ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError("Network error occurred");
  }
}

export async function apiGet<T = any>(url: string): Promise<APIResponse<T>> {
  return apiRequest<T>(url, { method: "GET" });
}

export async function apiPost<T = any>(url: string, body?: any): Promise<APIResponse<T>> {
  return apiRequest<T>(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T = any>(url: string, body?: any): Promise<APIResponse<T>> {
  return apiRequest<T>(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = any>(url: string): Promise<APIResponse<T>> {
  return apiRequest<T>(url, { method: "DELETE" });
}

// Utility function for handling API calls with loading and message states
export async function handleAPICall<T = any>(
  apiCall: () => Promise<APIResponse<T>>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    successMessage?: string;
    showMessage?: (message: string, type: "success" | "error") => void;
  }
): Promise<T | null> {
  try {
    const response = await apiCall();

    if (response.success) {
      if (response.data !== undefined) {
        options?.onSuccess?.(response.data);
      }
      if (options?.successMessage && options?.showMessage) {
        options.showMessage(options.successMessage, "success");
      }
      return response.data || null;
    } else {
      const errorMessage = response.message || "Operation failed";
      options?.onError?.(errorMessage);
      options?.showMessage?.(errorMessage, "error");
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof APIError ? error.message : "An unexpected error occurred";
    options?.onError?.(errorMessage);
    options?.showMessage?.(errorMessage, "error");
    return null;
  }
}
