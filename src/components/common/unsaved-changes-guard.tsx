'use client';

import { useEffect } from 'react';

/**
 * 저장하지 않은 변경이 있을 때 이탈을 경고한다 (요구사항 11번).
 *
 * `beforeunload` 는 새로고침·탭 닫기·주소 이동을 잡는다. 브라우저가 문구를
 * 바꿔 표시하므로 메시지 내용은 우리가 정할 수 없다.
 *
 * Next.js 앱 내부 이동(Link 클릭)은 이 이벤트로 잡히지 않는다. 위저드에서는
 * "다음 단계"가 아닌 이동은 전부 명시적 버튼이라, 각 버튼에서 확인을 받는다.
 */
export function UnsavedChangesGuard({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // 일부 브라우저는 returnValue 가 설정되어야 경고를 띄운다.
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  return null;
}
