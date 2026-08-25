import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 'server-only' 는 Next.js 밖에서 import 하면 예외를 던진다.
      // 서버 전용 경계 검사는 `pnpm build` 가 담당하므로 테스트에서는 빈 모듈로 바꾼다.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // 기본은 node 환경. DOM이 필요한 테스트는 파일 상단에
    // `// @vitest-environment jsdom` 주석을 달아 개별 전환한다.
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    setupFiles: ['./tests/setup.ts'],
  },
});
