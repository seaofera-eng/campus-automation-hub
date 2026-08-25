'use client';

import { useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * 화면 오류 경계.
 *
 * 사용자에게는 무엇을 하면 되는지만 알려 준다. 스택 추적이나 내부 메시지는
 * 서버 로그에만 남긴다 (요구사항 18번: 민감정보를 애플리케이션 로그에 남기지 않는다 —
 * 반대로, 내부 오류 상세를 화면에 노출하지도 않는다).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ui] 화면 오류:', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <Alert tone="danger" title="화면을 표시하지 못했습니다">
        일시적인 문제일 수 있습니다. 아래 버튼으로 다시 시도해 주세요. 계속 같은 화면이 나오면
        관리자에게 문의해 주세요.
        {error.digest ? (
          <p className="mt-2 text-xs text-fg-subtle">문의 시 알려 주실 코드: {error.digest}</p>
        ) : null}
      </Alert>

      <div className="mt-4 flex gap-2">
        <Button onClick={reset}>다시 시도</Button>
        <Button variant="secondary" asChild>
          <a href="/dashboard">대시보드로 이동</a>
        </Button>
      </div>
    </div>
  );
}
