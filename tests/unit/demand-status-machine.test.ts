import { describe, expect, it } from 'vitest';
import {
  DEMAND_TRANSITIONS,
  assertDemandTransitionAllowed,
  availableDemandTransitions,
} from '@/domain/demand/status-machine';
import type { DemandTransitionContext } from '@/domain/demand/status-machine';
import { DomainError } from '@/domain/shared/errors';

function context(overrides: Partial<DemandTransitionContext> = {}): DemandTransitionContext {
  return { accountType: 'ADMIN',
    adminPermissions: ['REVIEW', 'MANAGE_USERS', 'MANAGE_CATEGORIES', 'MANAGE_TOOLS', 'MANAGE_NOTICES', 'VIEW_AUDIT'], isRequester: false, ...overrides };
}

describe('수요 상태 전환', () => {
  it.each(DEMAND_TRANSITIONS.map((rule) => [rule.from, rule.to] as const))(
    '%s → %s 는 관리자가 수행할 수 있다',
    (from, to) => {
      expect(() => assertDemandTransitionAllowed(from, to, context())).not.toThrow();
    },
  );

  it('DRAFT 에서 COMPLETED 로 건너뛸 수 없다', () => {
    expect(() => assertDemandTransitionAllowed('DRAFT', 'COMPLETED', context())).toThrowError(
      DomainError,
    );
  });

  it('CLOSED 는 종착 상태다', () => {
    expect(availableDemandTransitions('CLOSED', context())).toHaveLength(0);
  });

  it('등록 본인은 자기 수요를 공개할 수 있다', () => {
    expect(() =>
      assertDemandTransitionAllowed(
        'DRAFT',
        'OPEN',
        context({ accountType: 'USER', adminPermissions: [], isRequester: true }),
      ),
    ).not.toThrow();
  });

  it('남의 수요는 수요자 역할로 공개할 수 없다', () => {
    expect(() =>
      assertDemandTransitionAllowed(
        'DRAFT',
        'OPEN',
        context({ accountType: 'USER', adminPermissions: [], isRequester: false }),
      ),
    ).toThrowError(DomainError);
  });

  it('등록 본인이라도 개발 단계 전환은 검토자·관리자 몫이다', () => {
    expect(() =>
      assertDemandTransitionAllowed(
        'OPEN',
        'IN_DEVELOPMENT',
        context({ accountType: 'USER', adminPermissions: [], isRequester: true }),
      ),
    ).toThrowError(DomainError);
  });

  it('등록 본인은 자기 수요를 종료할 수 있다', () => {
    expect(() =>
      assertDemandTransitionAllowed(
        'OPEN',
        'CLOSED',
        context({ accountType: 'USER', adminPermissions: [], isRequester: true }),
      ),
    ).not.toThrow();
  });
});
