/**
 * API service for user level/world configuration management
 */

import { createAPIRequest } from "../config/api";

// Level Config Data Interfaces
export interface UserLevelConfigData {
  user_id: string;
  level_config: string[]; // Array of 7 strings (structure IDs or "empty")
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface UpdateLevelConfigRequest {
  level_config: string[];
}

export interface UpdateSlotConfigRequest {
  slot_index: number;
  structure_id: string;
}

// Level Config API calls
export async function getUserLevelConfig(
  userId: string
): Promise<APIResponse<UserLevelConfigData>> {
  try {
    const response = await createAPIRequest(`/api/level-config/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user level config:", error);
    return {
      success: false,
      message: "Failed to fetch user level config",
    };
  }
}

export async function updateUserLevelConfig(
  userId: string,
  levelConfig: string[]
): Promise<APIResponse<UserLevelConfigData>> {
  try {
    const response = await createAPIRequest(`/api/level-config/${userId}`, {
      method: "PUT",
      body: JSON.stringify({
        level_config: levelConfig,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user level config:", error);
    return {
      success: false,
      message: "Failed to update user level config",
    };
  }
}

export async function updateSlotConfig(
  userId: string,
  slotIndex: number,
  structureId: string
): Promise<APIResponse<UserLevelConfigData>> {
  try {
    const response = await createAPIRequest(`/api/level-config/${userId}/slot`, {
      method: "PATCH",
      body: JSON.stringify({
        slot_index: slotIndex,
        structure_id: structureId,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating slot config:", error);
    return {
      success: false,
      message: "Failed to update slot config",
    };
  }
}

export async function resetUserLevelConfig(
  userId: string
): Promise<APIResponse<UserLevelConfigData>> {
  try {
    const response = await createAPIRequest(`/api/level-config/${userId}/reset`, {
      method: "POST",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error resetting user level config:", error);
    return {
      success: false,
      message: "Failed to reset user level config",
    };
  }
}

export async function getAvailableStructures(
  userId: string,
  structureName: string
): Promise<APIResponse<{ available: number }>> {
  try {
    const response = await createAPIRequest(`/api/inventory/${userId}/available/${structureName}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting available structures:", error);
    return {
      success: false,
      message: "Failed to get available structures",
    };
  }
}
