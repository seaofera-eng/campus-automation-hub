import { describe, expect, it } from 'vitest';
import { DomainError } from '@/domain/shared/errors';
import {
  TOOL_TRANSITIONS,
  assertReasonProvided,
  assertTransitionAllowed,
  availableTransitions,
} from '@/domain/tool/status-machine';
import type { TransitionContext } from '@/domain/tool/status-machine';

/**
 * 요구사항 7번의 상태 전환 규칙 검증.
 * 이 표가 서버 측 단일 진실 원천이므로, 표에 없는 전환은 반드시 거부되어야 한다.
 */

function context(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    actorRole: 'ADMIN',
    isOwner: false,
    riskLevel: 'LOW',
    hasRiskChecklist: true,
    ...overrides,
  };
}

describe('도구 상태 전환 — 허용된 전환', () => {
  it('요구사항에 정의된 10개 전환만 존재한다', () => {
    expect(TOOL_TRANSITIONS).toHaveLength(10);
  });

  it.each(TOOL_TRANSITIONS.map((rule) => [rule.from, rule.to] as const))(
    '%s → %s 는 관리자가 수행할 수 있다',
    (from, to) => {
      expect(() => assertTransitionAllowed(from, to, context({ isOwner: true }))).not.toThrow();
    },
  );
});

describe('도구 상태 전환 — 거부되어야 하는 전환', () => {
  it('DRAFT 에서 APPROVED 로 건너뛸 수 없다', () => {
    expect(() => assertTransitionAllowed('DRAFT', 'APPROVED', context())).toThrowError(DomainError);
  });

  it('SUBMITTED 에서 PILOT 으로 검토를 건너뛸 수 없다', () => {
    expect(() => assertTransitionAllowed('SUBMITTED', 'PILOT', context())).toThrowError(DomainError);
  });

  it('RETIRED 는 종착 상태라 나갈 수 있는 전환이 없다', () => {
    expect(availableTransitions('RETIRED', context())).toHaveLength(0);
  });

  it('같은 상태로의 전환은 거부한다', () => {
    expect(() => assertTransitionAllowed('DRAFT', 'DRAFT', context())).toThrowError(DomainError);
  });
});

describe('도구 상태 전환 — 역할 제약', () => {
  it('개발자는 HUMAN_REVIEW 에서 PILOT 으로 스스로 승인할 수 없다', () => {
    expect(() =>
      assertTransitionAllowed('HUMAN_REVIEW', 'PILOT', context({ actorRole: 'DEVELOPER' })),
    ).toThrowError(/검토자|관리자/);
  });

  it('검토자는 PILOT 에서 APPROVED 로 정식 승인할 수 없다 (관리자 전용)', () => {
    expect(() =>
      assertTransitionAllowed('PILOT', 'APPROVED', context({ actorRole: 'REVIEWER' })),
    ).toThrowError(DomainError);
  });

  it('수요자는 어떤 도구 상태도 바꿀 수 없다', () => {
    const requester = context({ actorRole: 'REQUESTER', isOwner: true });
    expect(availableTransitions('DRAFT', requester)).toHaveLength(0);
    expect(availableTransitions('HUMAN_REVIEW', requester)).toHaveLength(0);
  });

  it('담당자가 아닌 개발자는 남의 도구를 제출할 수 없다', () => {
    expect(() =>
      assertTransitionAllowed(
        'DRAFT',
        'SUBMITTED',
        context({ actorRole: 'DEVELOPER', isOwner: false }),
      ),
    ).toThrowError(/담당자/);
  });

  it('담당 개발자는 자기 도구를 제출할 수 있다', () => {
    expect(() =>
      assertTransitionAllowed(
        'DRAFT',
        'SUBMITTED',
        context({ actorRole: 'DEVELOPER', isOwner: true }),
      ),
    ).not.toThrow();
  });
});

describe('도구 상태 전환 — 위험도 차단 (요구사항 15번)', () => {
  it('위험도 CRITICAL 이면 시범운영으로 갈 수 없다', () => {
    expect(() =>
      assertTransitionAllowed('HUMAN_REVIEW', 'PILOT', context({ riskLevel: 'CRITICAL' })),
    ).toThrowError(/매우 높음/);
  });

  it('위험도 CRITICAL 이면 정식 승인도 할 수 없다', () => {
    expect(() =>
      assertTransitionAllowed('PILOT', 'APPROVED', context({ riskLevel: 'CRITICAL' })),
    ).toThrowError(/매우 높음/);
  });

  it('체크리스트가 없으면 시범운영으로 갈 수 없다', () => {
    expect(() =>
      assertTransitionAllowed(
        'HUMAN_REVIEW',
        'PILOT',
        context({ hasRiskChecklist: false, riskLevel: null }),
      ),
    ).toThrowError(/체크리스트/);
  });

  it('CRITICAL 이어도 보완 요청이나 사용 중지는 막지 않는다', () => {
    expect(() =>
      assertTransitionAllowed(
        'HUMAN_REVIEW',
        'REVISION_REQUIRED',
        context({ riskLevel: 'CRITICAL' }),
      ),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed('APPROVED', 'SUSPENDED', context({ riskLevel: 'CRITICAL' })),
    ).not.toThrow();
  });
});

describe('상태 변경 이유', () => {
  it('5자 미만이면 거부한다', () => {
    expect(() => assertReasonProvided('짧음')).toThrowError(DomainError);
    expect(() => assertReasonProvided('    ')).toThrowError(DomainError);
  });

  it('5자 이상이면 통과한다', () => {
    expect(() => assertReasonProvided('개인정보 처리 항목 보완 필요')).not.toThrow();
  });
});
