import 'server-only';
import { hasAdminPermission } from '@/domain/authz/accounts';
import { assertCan } from '@/domain/authz/policies';
import { ownerDeleteBlockReason } from '@/domain/demand/deletion';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { DemandId } from '@/domain/shared/ids';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 수요 삭제 (리뷰 2026-08-30).
 *
 * 도구 삭제와 같은 구조다. 줄을 지우지 않고 `deletedAt` 만 채운다 —
 * 참여 신청·문의·도구 연결·토큰 지급 기록이 이 수요를 가리키고 있다.
 *
 * 자격(`assertCan`)과 상태(`ownerDeleteBlockReason`)를 따로 판단한다.
 * 올린 사람이 맞아도 누군가 개발을 맡고 있으면 지울 수 없다.
 */
export async function deleteDemand(actor: Profile, demandId: string): Promise<void> {
  const repositories = getRepositories();
  const demand = await repositories.demands.getDemand(asId<DemandId>(demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  assertCan(toActor(actor), 'demand:delete', { ownerId: demand.requesterUserId });

  const isOperator = hasAdminPermission(actor.accountType, actor.adminPermissions, 'MANAGE_TOOLS');
  if (!isOperator) {
    const blocked = ownerDeleteBlockReason(demand.status);
    if (blocked) throw conflict(blocked);
  }

  await repositories.demands.updateDemand({
    ...demand,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
