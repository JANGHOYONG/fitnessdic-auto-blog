import { redirect } from 'next/navigation';

// 미들웨어에서 인증 우회 처리 — 로그인 페이지는 바로 감수 페이지로 이동
export default function AdminLoginPage() {
  redirect('/admin/review');
}
