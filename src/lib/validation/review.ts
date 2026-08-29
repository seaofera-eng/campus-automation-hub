import { z } from 'zod';
import { REVIEW_COMMENT_KINDS } from '@/domain/review/types';
import { RISK_FACTOR_CODES } from '@/domain/tool/risk-checklist-rules';
import { RISK_LEVELS, TOOL_STATUSES } from '@/domain/tool/types';
import { optionalText, requiredText } from './common';

/**
 * 검토 · 상태 전환 폼 검증 (요구사항 7번·15번).
 */

/**
 * 상태 변경 이유 — **여기서 필수 여부를 정하지 않는다.**
 *
 * 필요한지 아닌지는 **어느 상태에서 어느 상태로 가느냐**에 달려 있다
 * (`TransitionRule.requiresReason`). 보완 요청은 판단이라 이유가 필요하고,
 * 검토 시작은 착수라 필요 없다. 그런데 이 스키마는 `fromStatus` 를 모른다 —
 * 화면이 보내지 않고, 보내더라도 믿을 값이 아니다.
 *
 * 그래서 길이만 막고, **필수 여부는 도메인의 `assertReasonProvided()` 가**
 * 판단한다. 거기서 던지는 오류에도 `reason` 필드 메시지가 들어 있어서
 * 화면에는 똑같이 칸 밑에 뜬다.
 *
 * 전에는 여기서 5자를 강제했다. 그래서 이유를 묻지 않기로 한 전환
 * (검토 시작·시범운영 승인·정식 승인·신청 취소·재신청)이 화면에서
 * 빈 이유를 보내는 순간 **도메인에 닿기도 전에 전부 막혔다.**
 */
const transitionReason = z
  .string()
  .trim()
  .max(1000, '변경 이유는 1000자까지 입력할 수 있습니다.')
  .default('');

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

/**
 * 화면에서 AI 분석 돌리기 (리뷰 2026-08-30).
 *
 * 코드 자체는 여기서 검사하지 않는다. **맞는지 아닌지는 서버만 안다** —
 * 정답을 클라이언트 번들에 넣지 않기 위해서다. 여기서는 빈 값만 거른다.
 */
export const runAnalysisSchema = z.object({
  toolId: z.string().min(1),
  accessCode: requiredText('실행 코드', 1, 200),
});
