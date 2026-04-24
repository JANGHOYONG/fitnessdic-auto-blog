import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json();

  const adminPass = process.env.ADMIN_PASS || 'changeme';

  if (password !== adminPass) {
    return NextResponse.json({ error: '비밀번호 오류' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // HttpOnly 쿠키로 세션 저장 (7일)
  res.cookies.set('admin_session', adminPass, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return res;
}
