'use server';

import { revalidatePath } from 'next/cache';
import {
  addReviewComment,
  assignReviewer,
  saveRiskChecklist,
  transitionToolStatus,
} from '@/application/reviews/workflow';
import { withAudit } from '@/application/shared/audit';
import { TOOL_STATUS_LABELS } from '@/domain/tool/types';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import { parseOrThrow } from '@/lib/validation/common';
import {
  assignReviewerSchema,
  reviewCommentSchema,
  riskChecklistSchema,
  transitionStatusSchema,
} from '@/lib/validation/review';

/**
 * 검토 · 상태 전환 서버 액션.
 *
 * 모든 액션이 감사 로그를 남긴다. **관리자 작업도 예외가 아니다** (요구사항 18번).
 */

function revalidateTool(toolId: string): void {
  revalidatePath('/tools');
  revalidatePath(`/tools/${toolId}`);
  revalidatePath('/reviews');
  revalidatePath(`/reviews/${toolId}`);
  revalidatePath('/dashboard');
}

export async function transitionToolStatusAction(
  input: unknown,
): Promise<ActionResult<{ status: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(transitionStatusSchema, input);

    const status = await withAudit(
      actor,
      {
        action: `tool.status.${data.toStatus.toLowerCase()}`,
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['status'],
        summary: `도구 상태를 '${TOOL_STATUS_LABELS[data.toStatus]}'(으)로 변경했습니다.`,
      },
      () =>
        transitionToolStatus(actor, {
          toolId: data.toolId,
          toStatus: data.toStatus,
          reason: data.reason,
          reviewComment: data.reviewComment,
        }),
    );

    revalidateTool(data.toolId);
    return { status };
  });
}

export async function assignReviewerAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(assignReviewerSchema, input);

    await withAudit(
      actor,
      {
        action: 'review.assign',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['reviewAssignment', 'status'],
        summary: data.reviewerUserId ? '검토자를 배정했습니다.' : '검토를 직접 맡았습니다.',
      },
      () => assignReviewer(actor, data.toolId, data.reviewerUserId || undefined),
    );

    revalidateTool(data.toolId);
    return null;
  });
}

export async function addReviewCommentAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(reviewCommentSchema, input);

    await withAudit(
      actor,
      {
        action: 'review.comment',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['reviewComments'],
        // 의견 본문은 감사 로그에 남기지 않는다. 원본은 review_comments 에 있다.
        summary: '검토 의견을 등록했습니다.',
      },
      () => addReviewComment(actor, data.toolId, data.kind, data.body),
    );

    revalidateTool(data.toolId);
    return null;
  });
}

export async function saveRiskChecklistAction(
  input: unknown,
): Promise<ActionResult<{ riskLevel: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(riskChecklistSchema, input);

    const checklist = await withAudit(
      actor,
      {
        action: 'review.checklist',
        targetType: 'tool',
        targetId: data.toolId,
        changedFields: ['riskChecklist', 'riskLevel'],
        summary: `위험 체크리스트를 저장했습니다. (등급: ${data.riskLevel})`,
      },
      () =>
        saveRiskChecklist(actor, {
          toolId: data.toolId,
          items: data.items,
          riskLevel: data.riskLevel,
          rationale: data.rationale,
        }),
    );

    revalidateTool(data.toolId);
    return { riskLevel: checklist.riskLevel };
  });
}
