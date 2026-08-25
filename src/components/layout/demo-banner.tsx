import { TriangleAlert } from 'lucide-react';

/**
 * DEMO 모드 전역 배너.
 *
 * 요구사항 2번·18번: 데모 데이터는 반드시 예시임을 명시하고, 데모 계정과
 * 운영 계정을 구분한다. 이 배너는 DEMO 모드에서 **모든 화면 최상단에 항상** 보인다.
 * 목록·상세의 이름 앞에도 `[예시]` 접두어가 붙으므로, 화면을 캡처해 옮겨도
 * 가상 데이터라는 사실이 함께 따라간다.
 */
export function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      <span>
        DEMO 모드입니다 — 화면의 모든 기관·부서·사용자·도구 정보는 실제와 무관한 가상의 예시
        데이터입니다.
      </span>
    </div>
  );
}
