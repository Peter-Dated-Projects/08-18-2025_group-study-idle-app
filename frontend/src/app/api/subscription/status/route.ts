import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

/**
 * GET /api/subscription/status
 * 
 * Check subscription status for the authenticated user.
 * Forwards the request to the backend subscription service.
 */
export async function GET(request: NextRequest) {
  try {
    // Forward cookies from the frontend request to the backend
    const cookieHeader = request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/subscription/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { 'Cookie': cookieHeader }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.detail || `Backend error: ${response.status}`,
          user_id: '',
          is_paid: false,
          source: 'error'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Subscription status API error:', error);
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
