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
    accountType: 'ADMIN',
    adminPermissions: ['REVIEW', 'MANAGE_USERS', 'MANAGE_CATEGORIES', 'MANAGE_TOOLS', 'MANAGE_NOTICES', 'VIEW_AUDIT'],
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

describe('도구 상태 전환 — 권한 제약', () => {
  const plainUser = { accountType: 'USER', adminPermissions: [] } as const;
  const reviewer = { accountType: 'ADMIN', adminPermissions: ['REVIEW'] } as const;
  const operator = { accountType: 'ADMIN', adminPermissions: ['MANAGE_TOOLS'] } as const;

  it('만든 사람이라도 자기 도구를 스스로 승인할 수는 없다', () => {
    expect(() =>
      assertTransitionAllowed('HUMAN_REVIEW', 'PILOT', context({ ...plainUser, isOwner: true })),
    ).toThrowError(/도구 검토/);
  });

  it('검토 권한이 있으면 보완 요청과 시범운영 승인을 할 수 있다', () => {
    expect(() =>
      assertTransitionAllowed('HUMAN_REVIEW', 'PILOT', context(reviewer)),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed('HUMAN_REVIEW', 'REVISION_REQUIRED', context(reviewer)),
    ).not.toThrow();
  });

  /**
   * 검토와 정식 승인을 일부러 다른 권한으로 나눠 둔다.
   * 검토한 사람이 혼자 정식 승인까지 끝내지 못하게 하는 이중 확인이다.
   * (예전 모델에서 '정식 승인'이 관리자 전용이던 것과 같은 취지다.)
   */
  it('검토 권한만으로는 정식 승인을 할 수 없다', () => {
    expect(() => assertTransitionAllowed('PILOT', 'APPROVED', context(reviewer))).toThrowError(
      /도구 운영/,
    );
    expect(() => assertTransitionAllowed('PILOT', 'APPROVED', context(operator))).not.toThrow();
  });

  it('검토 권한만으로는 사용 중지·폐기를 할 수 없다', () => {
    expect(() => assertTransitionAllowed('APPROVED', 'SUSPENDED', context(reviewer))).toThrowError(
      /도구 운영/,
    );
    expect(() => assertTransitionAllowed('APPROVED', 'RETIRED', context(reviewer))).toThrowError(
      /도구 운영/,
    );
  });

  it('도구 운영 권한이 있으면 사용 중지·폐기를 할 수 있다', () => {
    expect(() => assertTransitionAllowed('APPROVED', 'SUSPENDED', context(operator))).not.toThrow();
    expect(() => assertTransitionAllowed('SUSPENDED', 'RETIRED', context(operator))).not.toThrow();
  });

  /**
   * 예전에는 '수요자'가 도구 상태를 아예 못 바꿨다. 지금은 이용자와 개발자를
   * 나누지 않으므로, 판단 기준은 역할이 아니라 **자기 도구인가**이다.
   */
  it('남의 도구는 권한 없는 이용자가 손댈 수 없다', () => {
    const stranger = context({ ...plainUser, isOwner: false });
    expect(availableTransitions('DRAFT', stranger)).toHaveLength(0);
    expect(availableTransitions('HUMAN_REVIEW', stranger)).toHaveLength(0);
  });

  it('자기 도구라면 이용자도 신청과 재신청은 할 수 있다', () => {
    const owner = context({ ...plainUser, isOwner: true });
    expect(availableTransitions('DRAFT', owner).map((rule) => rule.to)).toEqual(['SUBMITTED']);
    expect(availableTransitions('REVISION_REQUIRED', owner).map((rule) => rule.to)).toEqual([
      'SUBMITTED',
    ]);
  });

  it('자기 도구라도 검토 단계의 전환은 할 수 없다', () => {
    const owner = context({ ...plainUser, isOwner: true });
    expect(availableTransitions('HUMAN_REVIEW', owner)).toHaveLength(0);
    expect(availableTransitions('APPROVED', owner)).toHaveLength(0);
  });

  it('담당자가 아니면 남의 도구를 제출할 수 없다', () => {
    expect(() =>
      assertTransitionAllowed('DRAFT', 'SUBMITTED', context({ ...plainUser, isOwner: false })),
    ).toThrowError(/만든 사람/);
  });

  it('만든 사람은 자기 도구를 제출할 수 있다', () => {
    expect(() =>
      assertTransitionAllowed('DRAFT', 'SUBMITTED', context({ ...plainUser, isOwner: true })),
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
