import type { CampusId, DemandId, ToolId, UserId } from '../shared/ids';

/**
 * 토큰 (리뷰 6.4절).
 *
 * 수요자가 "이만큼 주겠다"고 걸어 두고, 완성된 도구 중 마음에 드는 하나를 골라 준다.
 *
 * 설계에서 지킨 것 두 가지.
 *
 * 1. **원장은 append-only 다.** 잔액 컬럼을 따로 두지 않고 기록을 더해서 계산한다.
 *    잔액만 들고 있으면 "왜 이 숫자가 됐는지"를 못 밝힌다. 마이그레이션 0009 의
 *    `reward_ledgers` 도 트리거로 수정·삭제를 막아 둔다.
 * 2. **한 수요에 한 번만 수여한다.** 여러 도구에 나눠 주지 않는다. 리뷰에 적힌
 *    "완성된 도구 중에 마음에 드는 하나의 도구에 토큰을 수여" 그대로다.
 */

export const REWARD_ENTRY_KINDS = ['GRANT', 'AWARD'] as const;

export type RewardEntryKind = (typeof REWARD_ENTRY_KINDS)[number];

export const REWARD_ENTRY_KIND_LABELS: Record<RewardEntryKind, string> = {
  /** 처음 계정에 들어온 토큰 */
  GRANT: '지급',
  /** 수요자가 도구를 만든 사람에게 준 토큰 */
  AWARD: '수여',
};

export interface RewardEntry {
  id: string;
  campusId: CampusId;
  /** 토큰을 받는 사람 */
  userId: UserId;
  kind: RewardEntryKind;
  /** 양수만 쓴다. 차감이 필요하면 별도 종류를 만든다. */
  amount: number;
  /** 어떤 수요에 대한 수여인지 (GRANT 는 null) */
  demandId: DemandId | null;
  /** 어떤 도구에 준 것인지 (GRANT 는 null) */
  toolId: ToolId | null;
  /** 준 사람 (GRANT 는 null — 플랫폼이 준 것) */
  awardedBy: UserId | null;
  /** 왜 줬는지. 받는 사람이 보는 문장이다. */
  note: string;
  createdAt: string;
}

/** 한 사람의 토큰 현황 */
export interface RewardBalance {
  /** 지금까지 받은 총합 */
  total: number;
  /** 수여로 받은 것 */
  awarded: number;
  /** 최근 기록 몇 건 */
  recent: RewardEntry[];
}

/**
 * 기록을 더해 잔액을 낸다.
 * 저장소가 아니라 여기서 계산한다 — 규칙이 한 곳에만 있어야 한다.
 */
export function sumBalance(entries: readonly RewardEntry[]): RewardBalance {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const awarded = entries
    .filter((entry) => entry.kind === 'AWARD')
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    total,
    awarded,
    recent: [...entries]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
  };
}
