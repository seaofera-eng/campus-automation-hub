import 'server-only';
import type { MemberType } from '@/domain/authz/accounts';
import { hasAdminPermission } from '@/domain/authz/accounts';
import type { DemandComment } from '@/domain/demand/types';
import type { Profile } from '@/domain/identity/types';
import { forbidden, notFound } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { DemandId } from '@/domain/shared/ids';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 수요 문의 (리뷰 6.4절).
 *
 * "참여 신청을 하지 않고 댓글만 다는 기능이 있었으면 좋겠음. 개발자가 추가적인
 *  내용을 보고 개발여부를 판단할 수도 있기에 참여 신청을 바로 하지 않아도
 *  수요자에게 문의를 할 수 있어야 함."
 *
 * 참여 신청과 아무 관계가 없다. 물어보고 나서 참여할지 정하면 된다.
 */

export interface DemandCommentView extends DemandComment {
  authorName: string;
  authorMemberType: MemberType;
  /** 내가 쓴 글인가 — 지우기 버튼 노출에 쓴다 */
  isMine: boolean;
}

export async function listDemandComments(demandId: string): Promise<DemandCommentView[]> {
  const actor = await requireUser();
  const repositories = getRepositories();

  const [comments, profiles] = await Promise.all([
    repositories.demands.listComments(asId<DemandId>(demandId)),
    repositories.identity.listProfiles(actor.campusId),
  ]);

  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  return comments.map((comment) => {
    const author = byId.get(comment.authorUserId);
    return {
      ...comment,
      authorName: author?.name ?? '알 수 없음',
      authorMemberType: author?.memberType ?? 'STAFF',
      isMine: comment.authorUserId === actor.id,
    };
  });
}

export interface AddDemandCommentInput {
  demandId: string;
  body: string;
}

export async function addDemandComment(
  actor: Profile,
  input: AddDemandCommentInput,
): Promise<DemandComment> {
  const repositories = getRepositories();

  const demand = await repositories.demands.getDemand(asId<DemandId>(input.demandId));
  if (!demand || demand.deletedAt !== null) throw notFound('수요');

  // 아직 공개하지 않은 수요에는 등록자 말고 아무도 글을 달 수 없다.
  if (demand.status === 'DRAFT' && demand.requesterUserId !== actor.id) {
    throw notFound('수요');
  }

  return repositories.demands.insertComment({
    id: newId<string>(),
    campusId: actor.campusId,
    demandId: demand.id,
    authorUserId: actor.id,
    body: input.body,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  });
}

/**
 * 문의 지우기.
 *
 * 자기가 쓴 글만 지운다. 검토 권한자는 부적절한 글을 정리할 수 있다.
 * 실제로 지우지 않고 감춘다 — 대화 맥락이 통째로 사라지면 남은 답글이 이상해진다.
 */
export async function deleteDemandComment(actor: Profile, commentId: string): Promise<void> {
  const repositories = getRepositories();

  // 저장소에 단건 조회가 없다. 목록에서 찾는다 — 수요 하나의 문의는 많지 않다.
  const demands = await repositories.demands.listDemands(
    { campusId: actor.campusId },
    { page: 1, pageSize: 1000 },
  );

  for (const demand of demands.items) {
    const comments = await repositories.demands.listComments(demand.id);
    const found = comments.find((comment) => comment.id === commentId);
    if (!found) continue;

    const isMine = found.authorUserId === actor.id;
    const canModerate = hasAdminPermission(actor.accountType, actor.adminPermissions, 'REVIEW');
    if (!isMine && !canModerate) {
      throw forbidden('자기가 쓴 글만 지울 수 있습니다.');
    }

    await repositories.demands.softDeleteComment(commentId, new Date().toISOString());
    return;
  }

  throw notFound('문의');
}
