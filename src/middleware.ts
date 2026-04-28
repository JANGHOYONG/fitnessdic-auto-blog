import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 어드민 인증 비활성화 — 내부 운영용 (비밀번호 없이 접속)
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
