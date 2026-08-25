import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { assertImprovementTransitionAllowed } from '@/domain/improvement/status-machine';
import type {
  ImpactLevel,
  ImprovementRequest,
  ImprovementStatus,
  ImprovementType,
  UrgencyLevel,
} from '@/domain/improvement/types';
import { IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import { notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { ImprovementRequestId, ToolId, UserId } from '@/domain/shared/ids';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import { notifyMany } from '../shared/notify';
import { josa } from '@/domain/shared/josa';

/**
 * 개선 요청 (요구사항 9번).
 *
 * 상태 전환은 도메인 상태머신이 판단한다. 요청자는 자기 요청을 철회할 수 있고,
 * 배정된 담당 개발자는 처리 단계를 진행할 수 있다.
 */

export interface CreateImprovementInput {
  toolId: string;
  title: string;
  requestType: ImprovementType;
  detail: string;
  businessImpact: ImpactLevel;
  urgency: UrgencyLevel;
}

export async function createImprovement(
  actor: Profile,
  input: CreateImprovementInput,
): Promise<ImprovementRequest> {
  const repositories = getRepositories();
  assertCan(toActor(actor), 'improvement:create');

  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  if (tool.status === 'RETIRED') {
    throw preconditionFailed(
      '폐기된 도구에는 개선을 요청할 수 없습니다. 필요하다면 새 수요로 등록해 주세요.',
    );
  }

  const now = new Date().toISOString();
  const request = await repositories.improvements.insert({
    id: newId<ImprovementRequestId>(),
    campusId: tool.campusId,
    toolId: tool.id,
    title: input.title,
    requestType: input.requestType,
    detail: input.detail,
    businessImpact: input.businessImpact,
    urgency: input.urgency,
    requesterUserId: actor.id,
    // 만든 사람이 곧 담당자다. 따로 배정하는 절차를 두지 않는다 (리뷰 8.2절).
    assignedDeveloperUserId: tool.ownerUserId,
    status: 'OPEN',
    handlingComment: '',
    targetCompletionDate: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    deletedAt: null,
  });

  // 도구 담당자와 개발자에게 알린다.
  await notifyMany([tool.ownerUserId, ...tool.developerUserIds].filter((id) => id !== actor.id), {
    campusId: tool.campusId,
    kind: 'IMPROVEMENT_STATUS_CHANGED',
    title: `'${tool.name}'에 개선 요청이 등록되었습니다`,
    // 요청 본문은 알림에 담지 않는다. 상세에서 보게 한다.
    body: request.title,
    linkPath: `/improvements/${request.id}`,
  });

  return request;
}

export interface TransitionImprovementInput {
  improvementId: string;
  toStatus: ImprovementStatus;
  comment: string;
}

export async function transitionImprovement(
  actor: Profile,
  input: TransitionImprovementInput,
): Promise<ImprovementStatus> {
  const repositories = getRepositories();
  const request = await repositories.improvements.getById(
    asId<ImprovementRequestId>(input.improvementId),
  );
  if (!request || request.deletedAt !== null) throw notFound('개선 요청');

  assertCan(toActor(actor), 'improvement:transition', {
    ownerId: request.requesterUserId,
    assigneeId: request.assignedDeveloperUserId,
  });

  assertImprovementTransitionAllowed(request.status, input.toStatus, {
    accountType: actor.accountType,
    adminPermissions: actor.adminPermissions,
    isRequester: request.requesterUserId === actor.id,
    isAssignee: request.assignedDeveloperUserId === actor.id,
  });

  const now = new Date().toISOString();

  await repositories.improvements.update({
    ...request,
    status: input.toStatus,
    // 처리 의견은 마지막 것을 본문에 두고, 전체 흐름은 이력에서 본다.
    handlingComment: input.comment || request.handlingComment,
    updatedAt: now,
  });

  await repositories.improvements.insertHistory({
    id: newId<string>(),
    improvementRequestId: request.id,
    fromStatus: request.status,
    toStatus: input.toStatus,
    changedBy: actor.id,
    changedAt: now,
    comment: input.comment,
  });

  // 요청자와 담당자 중 본인이 아닌 사람에게 알린다.
  const recipients = [request.requesterUserId, request.assignedDeveloperUserId]
    .filter((id): id is UserId => id !== null)
    .filter((id) => id !== actor.id);

  await notifyMany(recipients, {
    campusId: request.campusId,
    kind: 'IMPROVEMENT_STATUS_CHANGED',
    title: `개선 요청 '${request.title}'${josa(request.title, '이가')} ${IMPROVEMENT_STATUS_LABELS[input.toStatus]} 상태가 되었습니다`,
    body: '개선 요청 상세에서 처리 내용을 확인해 주세요.',
    linkPath: `/improvements/${request.id}`,
  });

  return input.toStatus;
}

export interface AssignImprovementInput {
  improvementId: string;
  developerUserId: string;
  targetCompletionDate: string;
}
