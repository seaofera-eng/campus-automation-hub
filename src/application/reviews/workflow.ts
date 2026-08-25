import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type {
  ReviewAssignmentId,
  ReviewCommentId,
  RiskChecklistId,
  StatusHistoryId,
  ToolId,
  UserId,
} from '@/domain/shared/ids';
import type { ReviewAssignment, ReviewComment, ReviewCommentKind } from '@/domain/review/types';
import type { RiskChecklist, RiskChecklistItem } from '@/domain/tool/risk-checklist-rules';
import { assertReasonProvided, assertTransitionAllowed } from '@/domain/tool/status-machine';
import type { AutomationTool, RiskLevel, ToolStatus } from '@/domain/tool/types';
import { TOOL_STATUS_LABELS } from '@/domain/tool/types';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import { notifyMany } from '../shared/notify';

/**
 * 승인 워크플로 (요구사항 7번·15번).
 *
 * 상태 전환의 최종 판단은 **항상 도메인 상태머신**이 한다.
 * 화면에서 버튼을 감췄는지, 어떤 경로로 요청이 들어왔는지와 무관하다.
 */

/* -------------------------------------------------------------------------- */
/* 상태 전환                                                                    */
/* -------------------------------------------------------------------------- */

export interface TransitionInput {
  toolId: string;
  toStatus: ToolStatus;
  reason: string;
  reviewComment: string;
}

export async function transitionToolStatus(
  actor: Profile,
  input: TransitionInput,
): Promise<ToolStatus> {
  const repositories = getRepositories();
  const toolId = asId<ToolId>(input.toolId);

  const tool = await repositories.tools.getTool(toolId);
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  assertCan(toActor(actor), 'tool:transition', {
    ownerId: tool.ownerUserId,
    developerIds: tool.developerUserIds,
    departmentId: tool.departmentId,
  });

  // 사용 중지·폐기는 관리자 전용이라 별도 권한을 한 번 더 확인한다.
  if (input.toStatus === 'SUSPENDED') assertCan(toActor(actor), 'tool:suspend');
  if (input.toStatus === 'RETIRED') assertCan(toActor(actor), 'tool:retire');

  assertReasonProvided(input.reason);

  // 위험 체크리스트는 PILOT·APPROVED 전환의 전제 조건이다.
  const checklist = await repositories.reviews.getChecklist(tool.currentVersionId);

  assertTransitionAllowed(tool.status, input.toStatus, {
    actorRole: actor.role,
    isOwner: tool.ownerUserId === actor.id || tool.developerUserIds.includes(actor.id),
    riskLevel: checklist?.riskLevel ?? null,
    hasRiskChecklist: checklist !== null,
  });

  const now = new Date().toISOString();
  await repositories.tools.updateTool({ ...tool, status: input.toStatus, updatedAt: now });
  await repositories.tools.insertStatusHistory({
    id: newId<StatusHistoryId>(),
    toolId,
    fromStatus: tool.status,
    toStatus: input.toStatus,
    changedBy: actor.id,
    changedAt: now,
    reason: input.reason,
    reviewComment: input.reviewComment,
  });

  // 검토가 끝났으면 배정도 완료 처리한다.
  if (input.toStatus === 'PILOT' || input.toStatus === 'REVISION_REQUIRED') {
    await completeAssignment(tool, now);
  }

  await notifyStatusChange(actor, tool, input);

  return input.toStatus;
}

async function completeAssignment(tool: AutomationTool, at: string): Promise<void> {
  const repositories = getRepositories();
  const assignment = await repositories.reviews.getAssignmentForVersion(tool.currentVersionId);
  if (!assignment || assignment.status === 'COMPLETED') return;

  await repositories.reviews.upsertAssignment({
    ...assignment,
    status: 'COMPLETED',
    completedAt: at,
  });
}

async function notifyStatusChange(
  actor: Profile,
  tool: AutomationTool,
  input: TransitionInput,
): Promise<void> {
  // 담당자와 개발자에게 알린다. 본인이 바꾼 경우는 알릴 필요가 없다.
  const recipients = [tool.ownerUserId, ...tool.developerUserIds].filter((id) => id !== actor.id);
  if (recipients.length === 0) return;

  await notifyMany(recipients, {
    campusId: tool.campusId,
    kind: input.toStatus === 'REVISION_REQUIRED' ? 'REVISION_REQUESTED' : 'TOOL_STATUS_CHANGED',
    title: `'${tool.name}' 상태가 ${TOOL_STATUS_LABELS[input.toStatus]}(으)로 바뀌었습니다`,
    // 사유를 그대로 넣지 않는다. 알림 목록에 오래 남기 때문에 링크로 보게 한다.
    body: '자세한 내용은 도구 상세의 활동 이력에서 확인해 주세요.',
    linkPath: `/tools/${tool.id}`,
  });
}

/* -------------------------------------------------------------------------- */
/* 검토 배정                                                                    */
/* -------------------------------------------------------------------------- */

export async function assignReviewer(
  actor: Profile,
  toolId: string,
  reviewerUserId?: string,
): Promise<ReviewAssignment> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  const targetReviewer = reviewerUserId ? asId<UserId>(reviewerUserId) : actor.id;

  // 검토자는 자기 자신에게만 배정할 수 있다. 관리자는 누구에게든 배정할 수 있다.
  assertCan(toActor(actor), 'review:assign', { assigneeId: targetReviewer });

  if (tool.status !== 'SUBMITTED' && tool.status !== 'HUMAN_REVIEW') {
    throw conflict(
      `'${TOOL_STATUS_LABELS[tool.status]}' 상태의 도구에는 검토자를 배정할 수 없습니다. 등록 신청된 도구만 배정할 수 있습니다.`,
    );
  }

  const reviewer = await repositories.identity.getProfile(targetReviewer);
  if (!reviewer) throw notFound('검토자');
  if (reviewer.role !== 'REVIEWER' && reviewer.role !== 'ADMIN') {
    throw preconditionFailed(
      '검토자 또는 관리자 역할을 가진 사용자에게만 검토를 배정할 수 있습니다.',
    );
  }

  const now = new Date().toISOString();
  const existing = await repositories.reviews.getAssignmentForVersion(tool.currentVersionId);

  const assignment = await repositories.reviews.upsertAssignment({
    id: existing?.id ?? newId<ReviewAssignmentId>(),
    campusId: tool.campusId,
    toolId: tool.id,
    toolVersionId: tool.currentVersionId,
    reviewerUserId: targetReviewer,
    status: 'IN_PROGRESS',
    assignedBy: actor.id,
    assignedAt: existing?.assignedAt ?? now,
    completedAt: null,
  });

  // 배정과 동시에 검토 단계로 넘긴다. 별도 버튼을 한 번 더 누르게 할 이유가 없다.
  if (tool.status === 'SUBMITTED') {
    await repositories.tools.updateTool({ ...tool, status: 'HUMAN_REVIEW', updatedAt: now });
    await repositories.tools.insertStatusHistory({
      id: newId<StatusHistoryId>(),
      toolId: tool.id,
      fromStatus: 'SUBMITTED',
      toStatus: 'HUMAN_REVIEW',
      changedBy: actor.id,
      changedAt: now,
      reason: `${reviewer.name} 검토자가 배정되어 검토를 시작합니다.`,
      reviewComment: '',
    });
  }

  if (targetReviewer !== actor.id) {
    await notifyMany([targetReviewer], {
      campusId: tool.campusId,
      kind: 'REVIEW_ASSIGNED',
      title: `'${tool.name}' 검토가 배정되었습니다`,
      body: '검토 화면에서 위험 체크리스트를 작성해 주세요.',
      linkPath: `/reviews/${tool.id}`,
    });
  }

  return assignment;
}

/* -------------------------------------------------------------------------- */
/* 검토 의견                                                                    */
/* -------------------------------------------------------------------------- */

export async function addReviewComment(
  actor: Profile,
  toolId: string,
  kind: ReviewCommentKind,
  body: string,
): Promise<ReviewComment> {
  const repositories = getRepositories();
  assertCan(toActor(actor), 'review:comment');

  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  const comment = await repositories.reviews.insertComment({
    id: newId<ReviewCommentId>(),
    toolId: tool.id,
    toolVersionId: tool.currentVersionId,
    authorUserId: actor.id,
    kind,
    body,
    createdAt: new Date().toISOString(),
  });

  await notifyMany(
    [tool.ownerUserId, ...tool.developerUserIds].filter((id) => id !== actor.id),
    {
      campusId: tool.campusId,
      kind: 'TOOL_STATUS_CHANGED',
      title: `'${tool.name}'에 검토 의견이 등록되었습니다`,
      body: '도구 상세의 활동 이력에서 확인해 주세요.',
      linkPath: `/tools/${tool.id}`,
    },
  );

  return comment;
}

/* -------------------------------------------------------------------------- */
/* 위험 체크리스트                                                              */
/* -------------------------------------------------------------------------- */

export interface SaveChecklistInput {
  toolId: string;
  items: RiskChecklistItem[];
  riskLevel: RiskLevel;
  rationale: string;
}

export async function saveRiskChecklist(
  actor: Profile,
  input: SaveChecklistInput,
): Promise<RiskChecklist> {
  const repositories = getRepositories();
  assertCan(toActor(actor), 'review:checklist');

  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  const now = new Date().toISOString();
  const existing = await repositories.reviews.getChecklist(tool.currentVersionId);

  return repositories.reviews.upsertChecklist({
    id: existing?.id ?? newId<RiskChecklistId>(),
    toolVersionId: tool.currentVersionId,
    items: input.items,
    // 등급은 검토자가 고른 값을 그대로 저장한다. 자동 산정하지 않는다.
    riskLevel: input.riskLevel,
    rationale: input.rationale,
    reviewedBy: actor.id,
    reviewedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}
