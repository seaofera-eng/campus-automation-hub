import type { NextConfig } from 'next';

/**
 * 임시 공개 URL(터널)로 리뷰할 때만 쓰는 값.
 *
 * Next 는 Server Action 요청의 Origin 이 Host 와 다르면 거절한다. CSRF 방어라
 * 평소에는 그대로 두어야 하지만, 터널로 접속하면 Origin 이 터널 도메인이 되어
 * 로그인부터 막힌다. 그래서 **환경변수로 명시한 출처 하나만** 예외로 둔다.
 *
 * 예: TUNNEL_ORIGIN=example-abc.trycloudflare.com pnpm dev
 *
 * 값을 비워 두면(평소 개발·운영) 아무 예외도 열리지 않는다.
 */
const tunnelOrigin = process.env.TUNNEL_ORIGIN?.trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  experimental: {
    // 서버 액션 payload 상한 (첨부 메타데이터 포함 폼 대비)
    serverActions: {
      bodySizeLimit: '4mb',
      ...(tunnelOrigin ? { allowedOrigins: [tunnelOrigin] } : {}),
    },
  },
  // dev 모드에서 터널 도메인으로 들어온 정적 자원 요청을 허용한다.
  ...(tunnelOrigin ? { allowedDevOrigins: [tunnelOrigin] } : {}),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
