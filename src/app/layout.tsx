import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '캠퍼스 자동화 관제 플랫폼',
    template: '%s | 캠퍼스 자동화 관제 플랫폼',
  },
  description:
    '대학 내 AI 서비스와 업무 자동화 프로그램을 한 곳에 등록하고 검토·평가·개선하는 통합 관리 플랫폼입니다.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
