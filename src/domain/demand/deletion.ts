import type { DemandStatus } from './types';
import { DEMAND_STATUS_LABELS } from './types';

/**
 * 수요 삭제 규칙 (리뷰 2026-08-30).
 *
 * 도구와 같은 방식이다 — `deletedAt` 만 채우고 줄은 남긴다.
 * 참여 신청, 문의, 도구 연결, 토큰 지급 기록이 이 수요를 가리키고 있기 때문이다.
 *
 * ## 올린 사람이 지울 수 있는 때
 *
 * **아무도 이 수요를 맡지 않았을 때**다.
 *
 * - `임시저장` — 아직 공개하지 않았다.
 * - `공개` — 올라와 있지만 아직 아무도 맡지 않았다.
 * - `종료` — 올린 사람이 이미 접은 수요다.
 *
 * 누군가 도구를 붙였거나(`도구 연결됨`) 만들고 있는 중(`개발 중`·`시범운영`)이면
 * 막는다. **남이 일을 하고 있는데 요청서가 사라지면 안 된다.**
 * 접고 싶으면 '수요 종료'가 먼저다 — 모든 상태에서 종료로 갈 수 있다.
 *
 * `해결 완료` 도 막는다. 토큰이 지급된 기록이 걸려 있다.
 * 정말 지워야 하면 종료로 바꾼 뒤 지운다.
 */

/** 올린 사람이 지울 수 있는 상태 — 아무도 맡지 않았을 때. */
export const OWNER_DELETABLE_DEMAND_STATUSES: readonly DemandStatus[] = [
  'DRAFT',
  'OPEN',
  'CLOSED',
];

/** 지울 수 없는 상태면 그 이유를, 지울 수 있으면 `null` 을 돌려준다. */
export function ownerDeleteBlockReason(status: DemandStatus): string | null {
  if (OWNER_DELETABLE_DEMAND_STATUSES.includes(status)) return null;

  switch (status) {
    case 'MATCHED':
    case 'IN_DEVELOPMENT':
    case 'PILOT':
      return '누군가 이 수요를 맡아 진행하고 있어서 지울 수 없습니다. 접으시려면 먼저 "수요 종료"로 바꿔 주세요.';
    case 'COMPLETED':
      return '해결이 끝난 수요는 기록으로 남습니다. 그래도 지우시려면 먼저 "수요 종료"로 바꿔 주세요.';
    default:
      return `'${DEMAND_STATUS_LABELS[status]}' 상태에서는 지울 수 없습니다.`;
  }
}
