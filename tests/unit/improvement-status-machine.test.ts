import { describe, expect, it } from 'vitest';
import {
  IMPROVEMENT_TRANSITIONS,
  assertImprovementTransitionAllowed,
  availableImprovementTransitions,
} from '@/domain/improvement/status-machine';
import type { ImprovementTransitionContext } from '@/domain/improvement/status-machine';
import { DomainError } from '@/domain/shared/errors';

function context(
  overrides: Partial<ImprovementTransitionContext> = {},
): ImprovementTransitionContext {
  return { actorRole: 'ADMIN', isRequester: false, isAssignee: false, ...overrides };
}

describe('개선 요청 상태 전환', () => {
  it.each(IMPROVEMENT_TRANSITIONS.map((rule) => [rule.from, rule.to] as const))(
    '%s → %s 는 관리자가 수행할 수 있다',
    (from, to) => {
      expect(() => assertImprovementTransitionAllowed(from, to, context())).not.toThrow();
    },
  );

  it('OPEN 에서 RELEASED 로 건너뛸 수 없다', () => {
    expect(() => assertImprovementTransitionAllowed('OPEN', 'RELEASED', context())).toThrowError(
      DomainError,
    );
  });

  it('CLOSED 는 종착 상태다', () => {
    expect(availableImprovementTransitions('CLOSED', context())).toHaveLength(0);
  });

  it('배정된 담당 개발자는 검토를 시작할 수 있다', () => {
    expect(() =>
      assertImprovementTransitionAllowed(
        'OPEN',
        'REVIEWING',
        context({ actorRole: 'DEVELOPER', isAssignee: true }),
      ),
    ).not.toThrow();
  });

  it('배정되지 않은 개발자는 검토를 시작할 수 없다', () => {
    expect(() =>
      assertImprovementTransitionAllowed(
        'OPEN',
        'REVIEWING',
        context({ actorRole: 'DEVELOPER', isAssignee: false }),
      ),
    ).toThrowError(DomainError);
  });

  it('요청자는 자기 요청을 철회할 수 있다', () => {
    expect(() =>
      assertImprovementTransitionAllowed(
        'OPEN',
        'CLOSED',
        context({ actorRole: 'REQUESTER', isRequester: true }),
      ),
    ).not.toThrow();
  });

  it('요청자가 스스로 반영 확정을 할 수는 없다', () => {
    expect(() =>
      assertImprovementTransitionAllowed(
        'REVIEWING',
        'ACCEPTED',
        context({ actorRole: 'REQUESTER', isRequester: true }),
      ),
    ).toThrowError(DomainError);
  });
});
