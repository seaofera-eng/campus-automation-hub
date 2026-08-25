import 'server-only';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { DemandId, ToolId } from '@/domain/shared/ids';
import type { RewardBalance, RewardEntry } from '@/domain/reward/types';
import { sumBalance } from '@/domain/reward/types';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 토큰 (리뷰 6.4절).
 *
 * "수요하는 도구를 완성하면 개발자에게 보상으로 제공할 '토큰'을 입력하고,
 *  완성된 도구 중에 마음에 드는 하나의 도구에 토큰을 수여할 수 있는 시스템"
 *
 * 규칙 셋을 서버에서 강제한다.
 *   1. 수요를 올린 본인만 수여한다.
 *   2. 한 수요에 한 번만 수여한다.
 *   3. 자기 자신에게는 못 준다.
 */

/** 내 토큰 현황. 기록을 더해서 낸다. */
export async function loadMyBalance(): Promise<RewardBalance> {
  const actor = await requireUser();
  const entries = await getRepositories().rewards.listByUser(actor.id);
  return sumBalance(entries);
}

/** 다른 사람의 잔액. 도구 상세에서 만든 사람의 누적을 보여줄 때 쓴다. */
export async function loadBalanceOf(userId: string): Promise<RewardBalance> {
  const entries = await getRepositories().rewards.listByUser(asId(userId));
  return sumBalance(entries);
}

export interface AwardTokensInput {
  demandId: string;
  /** 토큰을 줄 도구 */
  toolId: string;
  note: string;
}

export async function awardTokens(actor: Profile, input: AwardTokensInput): Promise<RewardEntry> {
  const repositories = getRepositories();

  const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  // 수요를 올린 사람만 준다. 남의 수요에 걸린 토큰을 대신 줄 수는 없다.
  if (demand.requesterUserId !== actor.id) {
    throw preconditionFailed(
      '수요를 올린 사람만 토큰을 줄 수 있습니다. 이 수요는 다른 분이 올렸습니다.',
    );
  }

  if (demand.offeredTokens === null || demand.offeredTokens <= 0) {
    throw preconditionFailed(
      '이 수요에는 걸어 둔 토큰이 없습니다. 수요를 수정해 희망 수여 토큰을 먼저 정해 주세요.',
    );
  }

  const already = await repositories.rewards.findAwardForDemand(demand.id);
  if (already) {
    throw conflict('이 수요는 이미 토큰을 수여했습니다. 한 수요에 한 번만 줄 수 있습니다.');
  }

  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  // 자기가 만든 도구에 자기가 건 토큰을 주는 것은 막는다.
  if (tool.ownerUserId === actor.id) {
    throw preconditionFailed('자기가 만든 도구에는 토큰을 줄 수 없습니다.');
  }

  return repositories.rewards.insert({
    id: newId<string>(),
    campusId: actor.campusId,
    userId: tool.ownerUserId,
    kind: 'AWARD',
    amount: demand.offeredTokens,
    demandId: demand.id,
    toolId: tool.id,
    awardedBy: actor.id,
    note: input.note,
    createdAt: new Date().toISOString(),
  });
}

/**
 * 이 수요에 토큰을 줄 수 있는 상태인가. 화면에서 버튼 노출에 쓴다.
 * **보안 경계가 아니다.** 실제 차단은 awardTokens() 가 한다.
 */
export async function loadAwardState(
  actor: Profile,
  demandId: string,
): Promise<{ canAward: boolean; offeredTokens: number | null; alreadyAwarded: RewardEntry | null }> {
  const repositories = getRepositories();
  const demand = await repositories.demands.getDemand(asId<DemandId>(demandId));
  if (!demand) return { canAward: false, offeredTokens: null, alreadyAwarded: null };

  const alreadyAwarded = await repositories.rewards.findAwardForDemand(demand.id);

  return {
    canAward:
      demand.requesterUserId === actor.id &&
      demand.offeredTokens !== null &&
      demand.offeredTokens > 0 &&
      alreadyAwarded === null,
    offeredTokens: demand.offeredTokens,
    alreadyAwarded,
  };
}
