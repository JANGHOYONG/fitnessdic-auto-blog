import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/* 경로에 Basic Auth 적용
  if (pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'changeme';
    const expected = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    if (!authHeader || authHeader !== expected) {
      return new NextResponse('인증이 필요합니다', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
