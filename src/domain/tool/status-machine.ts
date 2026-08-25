import type { AdminPermission } from '../authz/accounts';
import { ADMIN_PERMISSION_LABELS, hasAdminPermission } from '../authz/accounts';
import type { PermissionHolder } from '../authz/accounts';
import { DomainError } from '../shared/errors';
import type { RiskLevel, ToolStatus } from './types';
import { TOOL_STATUS_LABELS } from './types';
import { josa } from '../shared/josa';

/**
 * 도구 상태 전환 규칙 (요구사항 7번).
 *
 * 이 표가 서버 측 단일 진실 원천이다. UI에서 버튼을 숨기는 것과 무관하게
 * 모든 상태 변경은 assertTransitionAllowed()를 통과해야 한다.
 */

export interface TransitionRule {
  from: ToolStatus;
  to: ToolStatus;
  /** 이 도구를 만든 사람이 직접 할 수 있는 전환인가 */
  allowsOwner: boolean;
  /** 관리 권한이 있어야 하는 전환이면 그 권한. 소유자만의 전환이면 null. */
  requiredPermission: AdminPermission | null;
  /** 사용자에게 보여줄 동작 이름 */
  label: string;
  /** 되돌리기 어려운 동작인가 — UI에서 확인 절차를 강제한다 */
  destructive: boolean;
}

export const TOOL_TRANSITIONS: readonly TransitionRule[] = [
  {
    from: 'DRAFT',
    to: 'SUBMITTED',
    allowsOwner: true,
    requiredPermission: null,
    label: '등록 신청',
    destructive: false,
  },
  {
    from: 'SUBMITTED',
    to: 'HUMAN_REVIEW',
    allowsOwner: false,
    requiredPermission: 'REVIEW',
    label: '검토 시작',
    destructive: false,
  },
  {
    from: 'HUMAN_REVIEW',
    to: 'REVISION_REQUIRED',
    allowsOwner: false,
    requiredPermission: 'REVIEW',
    label: '보완 요청',
    destructive: false,
  },
  {
    from: 'REVISION_REQUIRED',
    to: 'SUBMITTED',
    allowsOwner: true,
    requiredPermission: null,
    label: '보완 후 재신청',
    destructive: false,
  },
  {
    from: 'HUMAN_REVIEW',
    to: 'PILOT',
    allowsOwner: false,
    requiredPermission: 'REVIEW',
    label: '시범운영 승인',
    destructive: false,
  },
  {
    from: 'PILOT',
    to: 'APPROVED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '정식 승인',
    destructive: false,
  },
  {
    from: 'APPROVED',
    to: 'SUSPENDED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '사용 중지',
    destructive: true,
  },
  {
    from: 'SUSPENDED',
    to: 'APPROVED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '사용 재개',
    destructive: false,
  },
  {
    from: 'APPROVED',
    to: 'RETIRED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '폐기',
    destructive: true,
  },
  {
    from: 'SUSPENDED',
    to: 'RETIRED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '폐기',
    destructive: true,
  },
];

/**
 * 위험도가 CRITICAL 인 도구는 사람의 최종 검토 없이 운영 단계로 갈 수 없다 (요구사항 15번).
 * 1단계에서는 "체크리스트가 작성되어 있고 CRITICAL 이 아닐 것"을 서버에서 강제한다.
 */
const STATUSES_BLOCKED_FOR_CRITICAL_RISK: readonly ToolStatus[] = ['PILOT', 'APPROVED'];

export interface TransitionContext extends PermissionHolder {
  /** 행위자가 이 도구의 소유자 또는 개발자인가 */
  isOwner: boolean;
  /** 사람이 작성한 위험 체크리스트의 등급. 아직 없으면 null. */
  riskLevel: RiskLevel | null;
  /** 위험 체크리스트가 작성되었는가 */
  hasRiskChecklist: boolean;
}

export function findTransition(from: ToolStatus, to: ToolStatus): TransitionRule | undefined {
  return TOOL_TRANSITIONS.find((rule) => rule.from === from && rule.to === to);
}

/** 특정 상태에서 나갈 수 있는 모든 전환 */
export function transitionsFrom(from: ToolStatus): readonly TransitionRule[] {
  return TOOL_TRANSITIONS.filter((rule) => rule.from === from);
}

/** 주어진 상황에서 이 사용자가 실제로 실행할 수 있는 전환만 추린다. UI 버튼 노출에 사용. */
export function availableTransitions(
  from: ToolStatus,
  context: TransitionContext,
): readonly TransitionRule[] {
  return transitionsFrom(from).filter((rule) => checkTransition(rule, context) === null);
}

/** 전환이 불가능하면 사유 메시지를, 가능하면 null을 반환한다. */
function checkTransition(rule: TransitionRule, context: TransitionContext): string | null {
  const byOwner = rule.allowsOwner && context.isOwner;
  const byPermission =
    rule.requiredPermission !== null &&
    hasAdminPermission(context.accountType, context.adminPermissions, rule.requiredPermission);

  if (!byOwner && !byPermission) {
    if (rule.requiredPermission === null) {
      return `'${rule.label}'${josa(rule.label, '은는')} 이 도구를 만든 사람만 할 수 있습니다. 담당자에게 요청해 주세요.`;
    }
    return `'${rule.label}'${josa(rule.label, '은는')} '${ADMIN_PERMISSION_LABELS[rule.requiredPermission]}' 권한이 있어야 할 수 있습니다. 관리자에게 요청해 주세요.`;
  }

  if (STATUSES_BLOCKED_FOR_CRITICAL_RISK.includes(rule.to)) {
    if (!context.hasRiskChecklist) {
      return `'${rule.label}' 전에 위험 체크리스트를 먼저 작성해야 합니다. 검토 화면에서 체크리스트를 저장한 뒤 다시 시도해 주세요.`;
    }
    if (context.riskLevel === 'CRITICAL') {
      return `위험도가 '매우 높음'인 도구는 자동으로 ${TOOL_STATUS_LABELS[rule.to]} 상태가 될 수 없습니다. 위험 요소를 낮추고 체크리스트를 다시 평가해 주세요.`;
    }
  }

  return null;
}

/**
 * 상태 전환을 검증한다. 실패하면 DomainError를 던진다.
 * 모든 상태 변경 서비스는 저장 전에 반드시 이 함수를 호출한다.
 */
export function assertTransitionAllowed(
  from: ToolStatus,
  to: ToolStatus,
  context: TransitionContext,
): TransitionRule {
  if (from === to) {
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `이미 '${TOOL_STATUS_LABELS[to]}' 상태입니다. 다른 상태를 선택해 주세요.`,
    );
  }

  const rule = findTransition(from, to);
  if (!rule) {
    const allowed = transitionsFrom(from);
    const hint =
      allowed.length > 0
        ? `현재 상태에서는 ${allowed.map((r) => `'${TOOL_STATUS_LABELS[r.to]}'`).join(', ')}(으)로만 변경할 수 있습니다.`
        : '현재 상태에서는 더 이상 상태를 변경할 수 없습니다.';
    throw new DomainError(
      'INVALID_STATUS_TRANSITION',
      `'${TOOL_STATUS_LABELS[from]}'에서 '${TOOL_STATUS_LABELS[to]}'(으)로는 변경할 수 없습니다. ${hint}`,
    );
  }

  const problem = checkTransition(rule, context);
  if (problem) {
    throw new DomainError('FORBIDDEN', problem);
  }

  return rule;
}

/** 상태 변경 시 이유를 반드시 남긴다 (요구사항 7번). */
export function assertReasonProvided(reason: string): void {
  if (reason.trim().length < 5) {
    throw new DomainError(
      'VALIDATION_FAILED',
      '상태 변경 이유를 5자 이상 입력해 주세요. 나중에 이력에서 왜 바뀌었는지 확인할 수 있어야 합니다.',
      { reason: '5자 이상 입력해 주세요.' },
    );
  }
}
