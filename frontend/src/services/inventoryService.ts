/**
 * API service for user inventory and balance management
 */

import { createAPIRequest } from "../config/api";

export interface StructureInventoryItem {
  structure_name: string;
  count: number;
  currently_in_use: number;
}

export interface UserInventoryData {
  user_id: string;
  structure_inventory: StructureInventoryItem[];
  created_at: string;
  updated_at: string;
}

export interface UserBalanceData {
  user_id: string;
  bank_value: number;
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Inventory API calls
export async function getUserInventory(userId: string): Promise<APIResponse<UserInventoryData>> {
  try {
    const response = await createAPIRequest(`/api/inventory/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user inventory:", error);
    return {
      success: false,
      message: "Failed to fetch user inventory",
    };
  }
}

export async function updateUserInventory(
  userId: string,
  structureName: string,
  count: number
): Promise<APIResponse<UserInventoryData>> {
  try {
    const response = await createAPIRequest(`/api/inventory/${userId}/add`, {
      method: "POST",
      body: JSON.stringify({
        structure_name: structureName,
        count: count,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user inventory:", error);
    return {
      success: false,
      message: "Failed to update user inventory",
    };
  }
}

// Balance API calls
export async function getUserBalance(userId: string): Promise<APIResponse<UserBalanceData>> {
  try {
    const response = await createAPIRequest(`/api/balance/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user balance:", error);
    return {
      success: false,
      message: "Failed to fetch user balance",
    };
  }
}

export async function updateUserBalance(
  userId: string,
  amount: number
): Promise<APIResponse<UserBalanceData>> {
  try {
    const response = await createAPIRequest(`/api/balance/${userId}/update`, {
      method: "POST",
      body: JSON.stringify({
        amount: amount,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user balance:", error);
    return {
      success: false,
      message: "Failed to update user balance",
    };
  }
}

// Shop purchase API call
export async function purchaseStructure(
  userId: string,
  structureName: string,
  price: number
): Promise<{
  success: boolean;
  message?: string;
  balance?: any;
  inventory?: any;
}> {
  try {
    const response = await createAPIRequest(`/api/shop/purchase`, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        structure_name: structureName,
        price: price,
      }),
    });
    const data = await response.json();
    return data; // Return the response directly as it matches the backend structure
  } catch (error) {
    console.error("Error purchasing structure:", error);
    return {
      success: false,
      message: "Failed to purchase structure",
    };
  }
}
