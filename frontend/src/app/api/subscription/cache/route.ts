import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

/**
 * DELETE /api/subscription/cache
 * 
 * Invalidate subscription cache for the authenticated user.
 * Forwards the request to the backend subscription service.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Forward cookies from the frontend request to the backend
    const cookieHeader = request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/subscription/cache`, {
      method: 'DELETE',
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
          message: errorData.detail || `Backend error: ${response.status}`,
          user_id: ''
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Subscription cache invalidation API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        user_id: ''
      },
      { status: 500 }
    );
  }
}
