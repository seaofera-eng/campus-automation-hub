'use server';

import { revalidatePath } from 'next/cache';
import {
  createImprovement,
  transitionImprovement,
} from '@/application/improvements/workflow';
import { withAudit } from '@/application/shared/audit';
import { IMPROVEMENT_STATUS_LABELS } from '@/domain/improvement/types';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import { parseOrThrow } from '@/lib/validation/common';
import {
  createImprovementSchema,
  transitionImprovementSchema,
} from '@/lib/validation/improvement';

/** 개선 요청 서버 액션. */

function revalidateImprovement(improvementId: string, toolId?: string): void {
  revalidatePath('/improvements');
  revalidatePath(`/improvements/${improvementId}`);
  if (toolId) revalidatePath(`/tools/${toolId}`);
  revalidatePath('/dashboard');
}

export async function createImprovementAction(
  input: unknown,
): Promise<ActionResult<{ improvementId: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(createImprovementSchema, input);

    const request = await withAudit(
      actor,
      {
        action: 'improvement.create',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['improvementRequests'],
        // 요청 본문은 로그에 남기지 않는다. 원본은 improvement_requests 에 있다.
        summary: `개선 요청을 등록했습니다. (${data.requestType})`,
      },
      () =>
        createImprovement(actor, {
          toolId: data.toolId,
          title: data.title,
          requestType: data.requestType,
          detail: data.detail,
          businessImpact: data.businessImpact,
          urgency: data.urgency,
        }),
    );

    revalidateImprovement(request.id as string, data.toolId);
    return { improvementId: request.id as string };
  });
}

export async function transitionImprovementAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(transitionImprovementSchema, input);

    await withAudit(
      actor,
      {
        action: `improvement.status.${data.toStatus.toLowerCase()}`,
        targetType: 'improvement',
        targetId: data.improvementId,
        changedFields: ['status'],
        summary: `개선 요청 상태를 '${IMPROVEMENT_STATUS_LABELS[data.toStatus]}'(으)로 변경했습니다.`,
      },
      () =>
        transitionImprovement(actor, {
          improvementId: data.improvementId,
          toStatus: data.toStatus,
          comment: data.comment,
        }),
    );

    revalidateImprovement(data.improvementId);
    return null;
  });
}
