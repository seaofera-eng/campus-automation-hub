import type { AdminPermission } from '../authz/accounts';
import { hasAdminPermission } from '../authz/accounts';
import type { PermissionHolder } from '../authz/accounts';
import { DomainError } from '../shared/errors';
import type { DemandStatus } from './types';
import { DEMAND_STATUS_LABELS } from './types';
import { josa } from '../shared/josa';

/**
 * 수요 상태 전환 규칙 (요구사항 8번).
 *
 * 도구와 달리 수요는 등록한 사람이 직접 공개/종료할 수 있다.
 * 개발 진행 단계는 검토자 또는 관리자가 관리한다.
 */

export interface DemandTransitionRule {
  from: DemandStatus;
  to: DemandStatus;
  /** 관리 권한이 있어야 하는 전환이면 그 권한. 등록자만의 전환이면 null. */
  requiredPermission: AdminPermission | null;
  /** 수요를 등록한 본인도 수행할 수 있는가 */
  allowRequester: boolean;
  label: string;
  destructive: boolean;
}

export const DEMAND_TRANSITIONS: readonly DemandTransitionRule[] = [
  {
    from: 'DRAFT',
    to: 'OPEN',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 공개',
    destructive: false,
  },
  {
    from: 'OPEN',
    to: 'MATCHED',
    requiredPermission: 'REVIEW',
    allowRequester: false,
    label: '도구 연결 확정',
    destructive: false,
  },
  {
    from: 'OPEN',
    to: 'IN_DEVELOPMENT',
    requiredPermission: 'REVIEW',
    allowRequester: false,
    label: '개발 시작',
    destructive: false,
  },
  {
    from: 'MATCHED',
    to: 'IN_DEVELOPMENT',
    requiredPermission: 'REVIEW',
    allowRequester: false,
    label: '개발 시작',
    destructive: false,
  },
  {
    from: 'MATCHED',
    to: 'COMPLETED',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 해결 완료',
    destructive: false,
  },
  {
    from: 'IN_DEVELOPMENT',
    to: 'PILOT',
    requiredPermission: 'REVIEW',
    allowRequester: false,
    label: '시범운영 시작',
    destructive: false,
  },
  {
    from: 'PILOT',
    to: 'COMPLETED',
    requiredPermission: 'REVIEW',
    allowRequester: false,
    label: '완료 처리',
    destructive: false,
  },
  {
    from: 'OPEN',
    to: 'CLOSED',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 종료',
    destructive: true,
  },
  {
    from: 'MATCHED',
    to: 'CLOSED',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 종료',
    destructive: true,
  },
  {
    from: 'IN_DEVELOPMENT',
    to: 'CLOSED',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 종료',
    destructive: true,
  },
  {
    from: 'PILOT',
    to: 'CLOSED',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 종료',
    destructive: true,
  },
  {
    from: 'COMPLETED',
    to: 'CLOSED',
    requiredPermission: 'REVIEW',
    allowRequester: true,
    label: '수요 종료',
    destructive: false,
  },
];

export interface DemandTransitionContext extends PermissionHolder {
  /** 행위자가 이 수요를 등록한 본인인가 */
  isRequester: boolean;
}

export function findDemandTransition(
  from: DemandStatus,
  to: DemandStatus,
): DemandTransitionRule | undefined {
  return DEMAND_TRANSITIONS.find((rule) => rule.from === from && rule.to === to);
}

export function demandTransitionsFrom(from: DemandStatus): readonly DemandTransitionRule[] {
  return DEMAND_TRANSITIONS.filter((rule) => rule.from === from);
}

export function availableDemandTransitions(
  from: DemandStatus,
  context: DemandTransitionContext,
): readonly DemandTransitionRule[] {
  return demandTransitionsFrom(from).filter((rule) => isDemandTransitionAllowed(rule, context));
}

function isDemandTransitionAllowed(
  rule: DemandTransitionRule,
  context: DemandTransitionContext,
): boolean {
  if (rule.allowRequester && context.isRequester) return true;
  if (rule.requiredPermission === null) return false;
  return hasAdminPermission(context.accountType, context.adminPermissions, rule.requiredPermission);
}

export function assertDemandTransitionAllowed(
  from: DemandStatus,
  to: DemandStatus,
  context: DemandTransitionContext,
): DemandTransitionRule {
  if (from === to) {
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `이미 '${DEMAND_STATUS_LABELS[to]}' 상태입니다.`,
    );
  }

  const rule = findDemandTransition(from, to);
  if (!rule) {
    const allowed = demandTransitionsFrom(from);
    const hint =
      allowed.length > 0
        ? `현재 상태에서는 ${allowed.map((r) => `'${DEMAND_STATUS_LABELS[r.to]}'`).join(', ')}(으)로만 변경할 수 있습니다.`
        : '현재 상태에서는 더 이상 상태를 변경할 수 없습니다.';
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `'${DEMAND_STATUS_LABELS[from]}'에서 '${DEMAND_STATUS_LABELS[to]}'(으)로는 변경할 수 없습니다. ${hint}`,
    );
  }

  if (!isDemandTransitionAllowed(rule, context)) {
    throw new DomainError(
      'FORBIDDEN',
      `'${rule.label}'${josa(rule.label, '을를')} 수행할 권한이 없습니다. 수요를 등록한 사람이나 검토 권한을 가진 관리자에게 요청해 주세요.`,
    );
  }

  return rule;
}
