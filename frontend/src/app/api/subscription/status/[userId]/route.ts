import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

/**
 * GET /api/subscription/status/[userId]
 * 
 * Check subscription status for a specific user.
 * Forwards the request to the backend subscription service.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User ID is required',
          user_id: '',
          is_paid: false,
          source: 'error'
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/subscription/status/${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.detail || `Backend error: ${response.status}`,
          user_id: userId,
          is_paid: false,
          source: 'error'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('User subscription status API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        user_id: '',
        is_paid: false,
        source: 'error'
      },
      { status: 500 }
    );
  }
}
