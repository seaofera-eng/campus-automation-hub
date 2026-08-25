/**
 * Vitest 전역 셋업.
 *
 * 테스트는 항상 DEMO 모드에서 돈다. 실제 Supabase 자격증명이 .env.local 에
 * 들어 있더라도 테스트가 운영 데이터에 닿지 않도록 여기서 강제한다.
 */
process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
process.env.DEMO_SESSION_SECRET =
  process.env.DEMO_SESSION_SECRET ?? 'vitest-demo-secret-not-for-production-use';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
