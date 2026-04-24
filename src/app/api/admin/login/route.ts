import { NextResponse } from 'next/server';

// 고정 세션 토큰 — 미들웨어와 동일한 값
const SESSION_TOKEN = 'helix-admin-2026';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    const adminPass = process.env.ADMIN_PASS || 'changeme';

    console.log('[admin/login] ADMIN_PASS set:', !!process.env.ADMIN_PASS);

    if (!password || password !== adminPass) {
      return NextResponse.json({ error: '비밀번호 오류' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    // 고정 토큰을 쿠키에 저장 (7일)
    res.cookies.set('admin_session', SESSION_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
