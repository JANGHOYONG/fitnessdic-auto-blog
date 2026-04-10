import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: 112,
          background: 'linear-gradient(135deg, #6B5540 0%, #8B7355 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        {/* 💪 이모지 */}
        <div style={{ fontSize: 220, lineHeight: 1 }}>💪</div>
        {/* 텍스트 */}
        <div style={{ color: 'white', fontSize: 68, fontWeight: 900, letterSpacing: -2 }}>
          운동백과
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
