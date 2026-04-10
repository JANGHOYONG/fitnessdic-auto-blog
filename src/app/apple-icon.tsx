import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: 'linear-gradient(135deg, #8B7050 0%, #B09070 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {/* 💪 이모지 */}
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 8 }}>💪</div>
        {/* 텍스트 */}
        <div style={{ color: 'white', fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
          운동백과
        </div>
      </div>
    ),
    { ...size }
  );
}
