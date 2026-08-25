import { z } from 'zod';
import { REVIEW_COMMENT_KINDS } from '@/domain/review/types';
import { RISK_FACTOR_CODES } from '@/domain/tool/risk-checklist-rules';
import { RISK_LEVELS, TOOL_STATUSES } from '@/domain/tool/types';
import { optionalText, requiredText } from './common';

/**
 * 검토 · 상태 전환 폼 검증 (요구사항 7번·15번).
 */

/** 상태 변경 이유는 5자 이상. 나중에 이력에서 왜 바뀌었는지 알 수 있어야 한다. */
const transitionReason = requiredText('변경 이유', 5, 1000);

export const transitionStatusSchema = z.object({
  toolId: z.string().min(1),
  toStatus: z.enum(TOOL_STATUSES),
  reason: transitionReason,
  reviewComment: optionalText,
});

export const assignReviewerSchema = z.object({
  toolId: z.string().min(1),
  /** 비우면 자기 자신에게 배정한다. */
  reviewerUserId: optionalText,
});

export const reviewCommentSchema = z.object({
  toolId: z.string().min(1),
  kind: z.enum(REVIEW_COMMENT_KINDS).default('GENERAL'),
  body: requiredText('검토 의견', 5, 4000),
});

const checklistItemSchema = z.object({
  code: z.enum(RISK_FACTOR_CODES),
  applies: z.boolean().default(false),
  note: optionalText,
});

export const riskChecklistSchema = z
  .object({
    toolId: z.string().min(1),
    items: z.array(checklistItemSchema).min(1, '체크리스트 항목이 비어 있습니다.'),
    riskLevel: z.enum(RISK_LEVELS),
    rationale: requiredText('등급 판단 근거', 10, 2000),
  })
  .superRefine((value, context) => {
    // 해당되는 항목에는 어떤 통제를 적용했는지 적게 한다.
    // 체크만 하고 넘어가면 나중에 무엇을 확인했는지 알 수 없다.
    for (const [index, item] of value.items.entries()) {
      if (item.applies && item.note.trim() === '') {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'note'],
          message: '해당된다고 표시한 항목에는 적용한 통제 방안이나 판단 근거를 적어 주세요.',
        });
      }
    }
  });

export type RiskChecklistFormInput = z.output<typeof riskChecklistSchema>;
