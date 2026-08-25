import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 준비 상태 확인용 엔드포인트.
 * Playwright webServer가 이 응답을 기다린 뒤 E2E를 시작한다.
 * 비밀값이나 사용자 데이터는 절대 내려보내지 않는다.
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
    time: new Date().toISOString(),
  });
}
