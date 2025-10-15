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

export interface ImageInfoResponse {
  success: boolean;
  user_id: string;
  image_id: string;
  url: string;
  has_custom_picture: boolean;
  is_default: boolean;
}

export interface UploadImageResponse {
  success: boolean;
  image_id: string;
  message: string;
}

export interface UploadProfilePictureResponse {
  success: boolean;
  image_id: string;
  url: string;
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
 * Get comprehensive image information for a user including custom picture status
 * @param userId - The user ID to get image info for
 * @returns Promise with detailed image information
 */
export async function getUserImageInfo(userId: string): Promise<ImageInfoResponse> {
  const url = createBackendURL(`/images/user/${encodeURIComponent(userId)}/info`);

  const response = await fetch(url, {
    method: "GET",
    credentials: API_CONFIG.credentials,
  });

  if (!response.ok) {
    throw new Error(`Failed to get user image info: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a profile picture, automatically resize it to 128x128, and get the URL
 * If userId is provided, the old profile picture will be deleted before uploading the new one
 * @param file - The image file to upload
 * @param userId - Optional user ID to enable deletion of old profile picture
 * @returns Promise with upload response including image_id and URL
 */
export async function uploadProfilePicture(
  file: File,
  userId?: string
): Promise<UploadProfilePictureResponse> {
  // Build URL with optional user_id query parameter
  let url = createBackendURL("/images/upload/profile");
  if (userId) {
    url += `?user_id=${encodeURIComponent(userId)}`;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: API_CONFIG.credentials,
      body: formData, // Don't set Content-Type, let browser set it for FormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Profile picture upload failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.detail || `Failed to upload profile picture: ${response.statusText}`
        );
      } catch (parseError) {
        throw new Error(
          `Failed to upload profile picture: ${response.status} ${response.statusText}`
        );
      }
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Network error during profile picture upload:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error during profile picture upload");
  }
}

/**
 * Remove a user's profile picture from the database and MinIO storage
 * @param userId - The user ID to remove profile picture for
 * @returns Promise with removal confirmation
 */
export async function removeUserProfilePicture(
  userId: string
): Promise<{ success: boolean; message: string; user_id: string }> {
  const url = createBackendURL(`/images/user/${encodeURIComponent(userId)}/profile`);

  const response = await fetch(url, {
    method: "DELETE",
    credentials: API_CONFIG.credentials,
  });

  if (!response.ok) {
    throw new Error(`Failed to remove profile picture: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update a user's profile picture URL in the database
 * @param userId - The user ID to update
 * @param imageId - The new image ID
 * @returns Promise with update confirmation
 */
export async function updateUserProfilePicture(
  userId: string,
  imageId: string
): Promise<{ success: boolean; message: string; user?: any }> {
  const url = createBackendURL("/api/users/update-profile-picture");

  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: API_CONFIG.credentials,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        image_id: imageId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("User profile picture update failed:", response.status, errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.detail || `Failed to update user profile picture: ${response.statusText}`
        );
      } catch (parseError) {
        throw new Error(
          `Failed to update user profile picture: ${response.status} ${response.statusText}`
        );
      }
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Network error during user profile picture update:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error during user profile picture update");
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
