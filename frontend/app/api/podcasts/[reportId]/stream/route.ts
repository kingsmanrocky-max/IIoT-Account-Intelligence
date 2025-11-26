import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

    // Prepare headers for backend request
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
    };

    // Forward Range header if present (for seeking)
    const range = request.headers.get('Range');
    if (range) {
      headers['Range'] = range;
    }

    // Fetch from backend streaming endpoint
    const response = await fetch(
      `${backendUrl}/api/reports/${reportId}/podcast/stream`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData || { success: false, error: { code: 'STREAM_FAILED', message: 'Failed to stream podcast' } },
        { status: response.status }
      );
    }

    // Forward the streaming response with all necessary headers
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': response.headers.get('Content-Length') || '',
        'Accept-Ranges': 'bytes',
        ...(response.headers.get('Content-Range') && {
          'Content-Range': response.headers.get('Content-Range')!,
        }),
      },
    });
  } catch (error) {
    console.error('Podcast streaming proxy error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'PROXY_ERROR', message: 'Failed to proxy streaming request' } },
      { status: 500 }
    );
  }
}
