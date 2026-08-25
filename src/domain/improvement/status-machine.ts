import type { UserRole } from '../authz/roles';
import { DomainError } from '../shared/errors';
import type { ImprovementStatus } from './types';
import { IMPROVEMENT_STATUS_LABELS } from './types';
import { josa } from '../shared/josa';

/**
 * 개선 요청 상태 전환 규칙 (요구사항 9번).
 *
 * 처리 흐름은 담당 개발자와 검토자·관리자가 이끈다.
 * 요청자는 자신이 올린 요청을 종료(CLOSED)할 수 있다.
 */

export interface ImprovementTransitionRule {
  from: ImprovementStatus;
  to: ImprovementStatus;
  allowedRoles: readonly UserRole[];
  /** 요청을 올린 본인도 수행할 수 있는가 */
  allowRequester: boolean;
  /** 배정된 담당 개발자도 수행할 수 있는가 */
  allowAssignee: boolean;
  label: string;
  destructive: boolean;
}

export const IMPROVEMENT_TRANSITIONS: readonly ImprovementTransitionRule[] = [
  {
    from: 'OPEN',
    to: 'REVIEWING',
    allowedRoles: ['REVIEWER', 'ADMIN'],
    allowRequester: false,
    allowAssignee: true,
    label: '검토 시작',
    destructive: false,
  },
  {
    from: 'REVIEWING',
    to: 'ACCEPTED',
    allowedRoles: ['REVIEWER', 'ADMIN'],
    allowRequester: false,
    allowAssignee: true,
    label: '반영 확정',
    destructive: false,
  },
  {
    from: 'REVIEWING',
    to: 'REJECTED',
    allowedRoles: ['REVIEWER', 'ADMIN'],
    allowRequester: false,
    allowAssignee: true,
    label: '반려',
    destructive: true,
  },
  {
    from: 'ACCEPTED',
    to: 'IN_PROGRESS',
    allowedRoles: ['ADMIN'],
    allowRequester: false,
    allowAssignee: true,
    label: '처리 시작',
    destructive: false,
  },
  {
    from: 'IN_PROGRESS',
    to: 'RELEASED',
    allowedRoles: ['ADMIN'],
    allowRequester: false,
    allowAssignee: true,
    label: '반영 완료',
    destructive: false,
  },
  {
    from: 'RELEASED',
    to: 'CLOSED',
    allowedRoles: ['REVIEWER', 'ADMIN'],
    allowRequester: true,
    allowAssignee: true,
    label: '종료',
    destructive: false,
  },
  {
    from: 'REJECTED',
    to: 'CLOSED',
    allowedRoles: ['REVIEWER', 'ADMIN'],
    allowRequester: true,
    allowAssignee: false,
    label: '종료',
    destructive: false,
  },
  {
    from: 'OPEN',
    to: 'CLOSED',
    allowedRoles: ['ADMIN'],
    allowRequester: true,
    allowAssignee: false,
    label: '요청 철회',
    destructive: true,
  },
];

export interface ImprovementTransitionContext {
  actorRole: UserRole;
  isRequester: boolean;
  isAssignee: boolean;
}

export function findImprovementTransition(
  from: ImprovementStatus,
  to: ImprovementStatus,
): ImprovementTransitionRule | undefined {
  return IMPROVEMENT_TRANSITIONS.find((rule) => rule.from === from && rule.to === to);
}

export function improvementTransitionsFrom(
  from: ImprovementStatus,
): readonly ImprovementTransitionRule[] {
  return IMPROVEMENT_TRANSITIONS.filter((rule) => rule.from === from);
}

export function availableImprovementTransitions(
  from: ImprovementStatus,
  context: ImprovementTransitionContext,
): readonly ImprovementTransitionRule[] {
  return improvementTransitionsFrom(from).filter((rule) => isAllowed(rule, context));
}

function isAllowed(
  rule: ImprovementTransitionRule,
  context: ImprovementTransitionContext,
): boolean {
  if (rule.allowedRoles.includes(context.actorRole)) return true;
  if (rule.allowRequester && context.isRequester) return true;
  if (rule.allowAssignee && context.isAssignee) return true;
  return false;
}

export function assertImprovementTransitionAllowed(
  from: ImprovementStatus,
  to: ImprovementStatus,
  context: ImprovementTransitionContext,
): ImprovementTransitionRule {
  if (from === to) {
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `이미 '${IMPROVEMENT_STATUS_LABELS[to]}' 상태입니다.`,
    );
  }

  const rule = findImprovementTransition(from, to);
  if (!rule) {
    const allowed = improvementTransitionsFrom(from);
    const hint =
      allowed.length > 0
        ? `현재 상태에서는 ${allowed.map((r) => `'${IMPROVEMENT_STATUS_LABELS[r.to]}'`).join(', ')}(으)로만 변경할 수 있습니다.`
        : '현재 상태에서는 더 이상 상태를 변경할 수 없습니다.';
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `'${IMPROVEMENT_STATUS_LABELS[from]}'에서 '${IMPROVEMENT_STATUS_LABELS[to]}'(으)로는 변경할 수 없습니다. ${hint}`,
    );
  }

  if (!isAllowed(rule, context)) {
    throw new DomainError(
      'FORBIDDEN',
      `'${rule.label}'${josa(rule.label, '을를')} 수행할 권한이 없습니다. 담당 개발자 또는 검토자·관리자에게 요청해 주세요.`,
    );
  }

  return rule;
}
