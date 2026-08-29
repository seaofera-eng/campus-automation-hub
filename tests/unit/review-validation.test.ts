import { describe, expect, it } from 'vitest';
import { DomainError } from '@/domain/shared/errors';
import {
  TOOL_TRANSITIONS,
  assertReasonProvided,
} from '@/domain/tool/status-machine';
import { transitionStatusSchema } from '@/lib/validation/review';

/**
 * 입력 검증과 상태머신이 같은 말을 하는가.
 *
 * ## 왜 이 테스트가 필요한가
 *
 * 상태 전환마다 "이유를 적어야 하는가"가 다르다. 그 판단은 상태머신의
 * `requiresReason` 한 곳에 있다. 그런데 화면과 상태머신 **사이에** Zod 스키마가
 * 하나 더 있고, 거기서도 같은 질문에 답하고 있었다 — 그것도 다르게.
 *
 * 스키마는 `reason` 을 5자 이상으로 강제했다. 그래서 이유를 묻지 않기로 한
 * 전환들(검토 시작·시범운영 승인·정식 승인·신청 취소·재신청)은 화면이 빈
 * 이유를 보내는 순간 **상태머신에 닿기도 전에 전부 막혔다.** 승인 경로 전체가
 * 죽어 있었는데, 두 규칙이 서로 다른 파일에 있어서 아무 테스트도 걸리지 않았다.
 *
 * 그래서 개별 전환을 하나씩 확인하지 않고 **표 전체를 돌린다.** 나중에 전환이
 * 늘어나도 같이 검사된다.
 */
describe('상태 전환 입력 검증', () => {
  const noReasonNeeded = TOOL_TRANSITIONS.filter((rule) => !rule.requiresReason);
  const reasonNeeded = TOOL_TRANSITIONS.filter((rule) => rule.requiresReason);

  it('이유를 묻지 않는 전환이 표에 실제로 있다', () => {
    // 아래 테스트가 빈 배열을 돌면서 통과하는 일을 막는다.
    expect(noReasonNeeded.length).toBeGreaterThan(0);
    expect(reasonNeeded.length).toBeGreaterThan(0);
  });

  it.each(noReasonNeeded.map((rule) => [rule.label, rule.from, rule.to] as const))(
    "'%s'(%s → %s)은 이유가 비어 있어도 스키마를 통과한다",
    (_label, from, to) => {
      const parsed = transitionStatusSchema.safeParse({
        toolId: 'tool-1',
        toStatus: to,
        reason: '',
        reviewComment: '',
      });

      expect(parsed.success).toBe(true);
      // 상태머신도 같은 답을 해야 한다. 한쪽만 통과하면 화면에서 막힌다.
      expect(() => assertReasonProvided(from, to, '')).not.toThrow();
    },
  );

  it.each(reasonNeeded.map((rule) => [rule.label, rule.from, rule.to] as const))(
    "'%s'(%s → %s)은 이유가 짧으면 상태머신이 막는다",
    (_label, from, to) => {
      // 길이 판단은 도메인이 한다. 스키마는 길이 상한만 본다.
      expect(() => assertReasonProvided(from, to, '')).toThrow(DomainError);
      expect(() => assertReasonProvided(from, to, '짧음')).toThrow(DomainError);
      expect(() => assertReasonProvided(from, to, '외부 전송 대상이 빠졌습니다.')).not.toThrow();
    },
  );

  it('이유가 너무 길면 스키마가 막는다', () => {
    const parsed = transitionStatusSchema.safeParse({
      toolId: 'tool-1',
      toStatus: 'REVISION_REQUIRED',
      reason: '가'.repeat(1001),
      reviewComment: '',
    });

    expect(parsed.success).toBe(false);
  });

  it('이유의 앞뒤 공백은 제거된다', () => {
    const parsed = transitionStatusSchema.parse({
      toolId: 'tool-1',
      toStatus: 'REVISION_REQUIRED',
      reason: '  외부 전송 대상이 빠졌습니다.  ',
      reviewComment: '',
    });

    expect(parsed.reason).toBe('외부 전송 대상이 빠졌습니다.');
  });
});
