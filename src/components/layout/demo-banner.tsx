import { TriangleAlert } from 'lucide-react';

/**
 * DEMO 모드 전역 배너.
 *
 * 요구사항 2번·18번: 데모 데이터는 반드시 예시임을 명시하고, 데모 계정과
 * 운영 계정을 구분한다. 이 배너는 DEMO 모드에서 **모든 화면 최상단에 항상** 보인다.
 * 목록·상세의 이름 앞에도 `[예시]` 접두어가 붙으므로, 화면을 캡처해 옮겨도
 * 가상 데이터라는 사실이 함께 따라간다.
 *
 * ## 왜 꽉 찬 주황 띠가 아닌가
 *
 * 항상 떠 있는 알림이 화면에서 제일 강하면, 정작 봐야 할 것을 가린다.
 * 그렇다고 흐리게 만들면 요구사항을 어긴다. 그래서 **바탕은 옅게, 글자는 진하게**
 * 간다 — 대비는 오히려 올라갔다(흰 글씨 위 주황 3.9:1 → 먹색 위 옅은 주황 14.7:1).
 *
 * 경고라는 신호는 색이 아니라 아이콘과 문장이 진다 (요구사항 12번).
 */
export function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-xs font-medium text-fg"
    >
      <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        DEMO 모드입니다 — 화면의 모든 기관·사용자·도구 정보는 실제와 무관한 가상의 예시
        데이터입니다.
      </span>
    </div>
  );
}
