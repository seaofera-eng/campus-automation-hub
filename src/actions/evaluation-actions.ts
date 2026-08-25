'use server';

import { revalidatePath } from 'next/cache';
import { submitEvaluation, updateEvaluation } from '@/application/evaluations/submit';
import { withAudit } from '@/application/shared/audit';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import { parseOrThrow } from '@/lib/validation/common';
import { submitEvaluationSchema, updateEvaluationSchema } from '@/lib/validation/evaluation';

/**
 * 평가 서버 액션.
 *
 * 감사 로그에 **점수와 의견 내용을 담지 않는다.** 평가는 사람에 대한 판단이
 * 섞일 수 있어, 로그에는 "평가를 등록/수정했다"는 사실만 남긴다.
 */

export async function submitEvaluationAction(
  input: unknown,
): Promise<ActionResult<{ evaluationId: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(submitEvaluationSchema, input);

    const evaluation = await withAudit(
      actor,
      {
        action: 'evaluation.create',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['evaluation'],
        summary: '도구 평가를 등록했습니다.',
      },
      () =>
        submitEvaluation(actor, {
          toolId: data.toolId,
          scores: data.scores,
          comment: data.comment,
        }),
    );

    revalidatePath(`/tools/${data.toolId}`);
    revalidatePath('/tools');
    revalidatePath('/dashboard');

    return { evaluationId: evaluation.id as string };
  });
}

export async function updateEvaluationAction(
  input: unknown,
): Promise<ActionResult<{ toolId: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(updateEvaluationSchema, input);

    const evaluation = await withAudit(
      actor,
      {
        action: 'evaluation.update',
        targetType: 'evaluation',
        targetId: data.evaluationId,
        changedFields: ['scores', 'comment'],
        summary: '도구 평가를 수정했습니다. 이전 값은 이력에 남습니다.',
      },
      () =>
        updateEvaluation(actor, {
          evaluationId: data.evaluationId,
          scores: data.scores,
          comment: data.comment,
        }),
    );

    revalidatePath(`/tools/${evaluation.toolId}`);
    revalidatePath('/tools');

    return { toolId: evaluation.toolId as string };
  });
}
