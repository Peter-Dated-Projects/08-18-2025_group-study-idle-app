/**
 * Image API utilities for handling profile pictures via minIO
 */
import { createBackendURL, API_CONFIG } from "../../config/api";
import { APIResponse } from "./types";

export interface ImageResponse {
  success: boolean;
  image_id: string;
  url: string;
  user_id?: string; // For user-based requests
}

export interface UploadImageResponse {
  success: boolean;
  image_id: string;
  message: string;
}

/**
 * Get an image URL by image_id from minIO
 * @param imageId - The image ID to retrieve, or null/undefined for default
 * @returns Promise with image URL response
 */
export async function getImageUrl(imageId: string | null | undefined): Promise<ImageResponse> {
  const id = imageId || "None";
  const url = createBackendURL(`/images/${encodeURIComponent(id)}`);

  const response = await fetch(url, {
    method: "GET",
    credentials: API_CONFIG.credentials,
  });

  if (!response.ok) {
    throw new Error(`Failed to get image URL: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get an image URL by user_id from minIO (fetches user's profile picture)
 * This will look up the user's user_picture_url and return the appropriate image
 * @param userId - The user ID to get profile picture for
 * @returns Promise with image URL response
 */
export async function getImageUrlByUserId(userId: string): Promise<ImageResponse> {
  const url = createBackendURL(`/images/user/${encodeURIComponent(userId)}`);

  const response = await fetch(url, {
    method: "GET",
    credentials: API_CONFIG.credentials,
  });

  if (!response.ok) {
    throw new Error(`Failed to get user profile picture: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Smart image URL getter - determines if ID is a user ID or image ID
 * If imageId is provided, uses that directly
 * If userId is provided (and no imageId), fetches user's profile picture
 * If neither, returns default image
 * @param imageId - Specific image ID to fetch (takes priority)
 * @param userId - User ID to fetch profile picture for (fallback)
 * @returns Promise with image URL response
 */
export async function getImageUrlSmart(
  imageId?: string | null,
  userId?: string | null
): Promise<ImageResponse> {
  // Priority: imageId (including null) -> userId -> default
  if (imageId !== undefined) {
    // Explicit image ID provided (including null for default)
    return getImageUrl(imageId);
  } else if (userId) {
    // No image ID but user ID provided - fetch user's profile picture
    return getImageUrlByUserId(userId);
  } else {
    // Neither provided - get default
    return getImageUrl(null);
  }
}

/**
 * Upload a new image to minIO
 * @param file - The image file to upload
 * @returns Promise with upload response including new image_id
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const url = createBackendURL("/images/upload");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    credentials: API_CONFIG.credentials,
    body: formData, // Don't set Content-Type, let browser set it for FormData
  });

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete an image from minIO
 * @param imageId - The image ID to delete
 * @returns Promise with deletion confirmation
 */
export async function deleteImage(imageId: string): Promise<{ success: boolean; message: string }> {
  const url = createBackendURL(`/images/${encodeURIComponent(imageId)}`);

  const response = await fetch(url, {
    method: "DELETE",
    credentials: API_CONFIG.credentials,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete image: ${response.statusText}`);
  }

  return response.json();
}
