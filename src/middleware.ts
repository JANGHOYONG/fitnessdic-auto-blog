import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// API 라우트와 동일한 고정 토큰
const SESSION_TOKEN = 'helix-admin-2026';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login 과 /api/admin/login 은 인증 없이 허용
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }

  // /admin/* 나머지 경로 → 쿠키 확인
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value;

    if (session !== SESSION_TOKEN) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
