import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import { assertValidScores } from '@/domain/evaluation/scoring';
import type { EvaluationScores, ToolEvaluation } from '@/domain/evaluation/types';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { EvaluationId, ToolId } from '@/domain/shared/ids';
import { EVALUABLE_STATUSES, TOOL_STATUS_LABELS } from '@/domain/tool/types';
import { toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 도구 평가 (요구사항 9번).
 *
 * 규칙 두 가지가 핵심이다.
 *  - 평가는 **버전에 붙는다.** 새 버전이 나오면 다시 평가할 수 있다.
 *  - **같은 사용자가 같은 버전을 중복 평가할 수 없다.** DEMO 저장소는 저장 직전
 *    재확인으로, Supabase 는 부분 유니크 인덱스로 막는다. 여기서도 미리 확인해
 *    사용자에게 알아들을 수 있는 메시지를 준다.
 */

export interface SubmitEvaluationInput {
  toolId: string;
  scores: EvaluationScores;
  comment: string;
}

export async function submitEvaluation(
  actor: Profile,
  input: SubmitEvaluationInput,
): Promise<ToolEvaluation> {
  const repositories = getRepositories();
  assertCan(toActor(actor), 'evaluation:create');
  assertValidScores(input.scores);

  const tool = await repositories.tools.getTool(asId<ToolId>(input.toolId));
  if (!tool || tool.deletedAt !== null) throw notFound('도구');

  // 아직 써 볼 수 없는 도구는 평가 대상이 아니다.
  if (!EVALUABLE_STATUSES.includes(tool.status)) {
    throw preconditionFailed(
      `'${TOOL_STATUS_LABELS[tool.status]}' 상태의 도구는 평가할 수 없습니다. 시범운영 또는 정식 승인된 도구만 평가할 수 있습니다.`,
    );
  }

  const duplicate = await repositories.evaluations.findByUserAndVersion(
    actor.id,
    tool.currentVersionId,
  );
  if (duplicate) {
    throw conflict(
      '이 버전은 이미 평가하셨습니다. 생각이 바뀌었다면 기존 평가를 수정해 주세요. 수정 이력은 함께 남습니다.',
    );
  }

  const now = new Date().toISOString();

  try {
    return await repositories.evaluations.insert({
      id: newId<EvaluationId>(),
      campusId: tool.campusId,
      toolId: tool.id,
      toolVersionId: tool.currentVersionId,
      evaluatorUserId: actor.id,
      scores: input.scores,
      comment: input.comment,
      revisionCount: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  } catch (error) {
    // 저장소가 마지막 방어선에서 잡은 중복. 두 사람이 동시에 누른 경우 등.
    if (error instanceof Error && error.message === 'DUPLICATE_EVALUATION') {
      throw conflict('이 버전은 이미 평가하셨습니다. 기존 평가를 수정해 주세요.');
    }
    throw error;
  }
}

export interface UpdateEvaluationInput {
  evaluationId: string;
  scores: EvaluationScores;
  comment: string;
}

/**
 * 평가 수정.
 *
 * 이전 값을 `evaluation_history` 에 남긴 뒤 갱신한다. 이력 테이블은
 * append-only 라 나중에 고치거나 지울 수 없다.
 */
export async function updateEvaluation(
  actor: Profile,
  input: UpdateEvaluationInput,
): Promise<ToolEvaluation> {
  const repositories = getRepositories();
  assertValidScores(input.scores);

  const evaluation = await repositories.evaluations.getById(asId<EvaluationId>(input.evaluationId));
  if (!evaluation || evaluation.deletedAt !== null) throw notFound('평가');

  // 자기가 쓴 평가만 수정할 수 있다.
  assertCan(toActor(actor), 'evaluation:update', { ownerId: evaluation.evaluatorUserId });

  const now = new Date().toISOString();

  // 이력을 먼저 남긴다. 갱신이 성공했는데 이력이 빠지는 상황을 피한다.
  await repositories.evaluations.insertHistory({
    id: newId<string>(),
    evaluationId: evaluation.id,
    previousScores: evaluation.scores,
    previousComment: evaluation.comment,
    changedBy: actor.id,
    changedAt: now,
  });

  return repositories.evaluations.update({
    ...evaluation,
    scores: input.scores,
    comment: input.comment,
    revisionCount: evaluation.revisionCount + 1,
    updatedAt: now,
  });
}

/** 이 사용자가 이 도구의 현재 버전에 남긴 평가. 없으면 null. */
export async function findMyEvaluation(
  actor: Profile,
  toolId: string,
): Promise<ToolEvaluation | null> {
  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(asId<ToolId>(toolId));
  if (!tool) return null;
  return repositories.evaluations.findByUserAndVersion(actor.id, tool.currentVersionId);
}
