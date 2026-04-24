import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login 은 인증 없이 접근 허용
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // /admin/* 나머지 경로 → 쿠키 확인
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value;
    const adminPass = process.env.ADMIN_PASS || 'changeme';

    if (!session || session !== adminPass) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
