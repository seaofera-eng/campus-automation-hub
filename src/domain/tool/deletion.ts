import type { ToolStatus } from './types';
import { TOOL_STATUS_LABELS } from './types';

/**
 * 도구 삭제 규칙 (리뷰 2026-08-30).
 *
 * "자기가 올린 수요나 도구를 삭제할 수 있는 기능을 넣을 수 없을까?"
 *
 * ## 지우는 것이 아니라 감춘다
 *
 * `deletedAt` 만 채운다. 줄을 실제로 지우지 않는다. 이유가 셋 있다.
 *
 * 1. 평가·개선 요청·상태 이력이 이 도구를 가리키고 있다. 줄을 지우면 그것들이
 *    가리킬 곳을 잃는다.
 * 2. **감사 로그는 남아야 한다.** 누가 무엇을 지웠는지 답할 수 없으면
 *    관리 기록의 의미가 없다 (요구사항 18번).
 * 3. 잘못 지웠을 때 되돌릴 수 있다.
 *
 * 목록·개수 집계는 이미 `deletedAt` 이 있는 것을 빼고 세므로, 사용자에게는
 * 사라진 것으로 보인다.
 *
 * ## 만든 사람이 지울 수 있는 때
 *
 * **공이 아직 자기 손에 있을 때만**이다. 신청 취소(SUBMITTED → DRAFT)와 같은
 * 기준이다.
 *
 * - `임시저장` — 아직 아무도 보지 않았다.
 * - `등록 신청` — 검토가 시작되기 전이다.
 * - `보완 요청됨` — 공이 다시 등록자에게 넘어왔다.
 *
 * **검토가 시작된 뒤에는 막는다.** 검토자가 읽고 있는 것이 발밑에서 사라지면
 * 안 된다. 시범운영·정식 승인 이후에는 남이 쓰고 있으므로 더더욱 그렇다.
 * 그 상태에서는 관리자의 '폐기'가 제자리다.
 *
 * 다만 **도구 관리 권한을 가진 관리자는 상태와 무관하게 지울 수 있다.**
 * 잘못 올라온 것을 치우는 것은 운영의 일이다.
 */

/** 만든 사람이 지울 수 있는 상태 — 공이 아직 등록자에게 있을 때. */
export const OWNER_DELETABLE_TOOL_STATUSES: readonly ToolStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'REVISION_REQUIRED',
];

/**
 * 만든 사람이 지울 수 없는 상태면 그 이유를, 지울 수 있으면 `null` 을 돌려준다.
 *
 * 메시지는 화면에 그대로 나간다. **무엇이 막혔는지와 어떻게 하면 되는지**를
 * 함께 적는다.
 */
export function ownerDeleteBlockReason(status: ToolStatus): string | null {
  if (OWNER_DELETABLE_TOOL_STATUSES.includes(status)) return null;

  switch (status) {
    case 'AI_REVIEW':
    case 'HUMAN_REVIEW':
      return '검토가 진행 중인 도구는 지울 수 없습니다. 검토자에게 보완 요청을 부탁하시면 그때 지울 수 있습니다.';
    case 'PILOT':
    case 'APPROVED':
      return '이미 다른 사람이 쓸 수 있는 도구라 만든 사람이 지울 수 없습니다. 관리자에게 폐기를 요청해 주세요.';
    case 'SUSPENDED':
    case 'RETIRED':
      return '관리자가 관리하는 상태입니다. 지워야 한다면 관리자에게 요청해 주세요.';
    default:
      return `'${TOOL_STATUS_LABELS[status]}' 상태에서는 지울 수 없습니다.`;
  }
}
