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
  /**
   * 왜 바꾸는지 적어야 하는가 (리뷰 2026-08-28 5절).
   *
   * "검토시작을 누르면 별도로 뜨는 창이 필요가 없음. 그냥 검토 시작을 누르면
   *  [변경 이유]를 써야할 필요 없이 (…) 넘어가도 상관이 없을 것 같음"
   *
   * 맞는 지적이다. 전환마다 성격이 다르다.
   *
   * - **검토 시작**은 "내가 맡아서 본다"는 뜻이다. 판단이 아니라 착수라
   *   적을 말이 없고, 매번 "확인하겠습니다"를 치게 하면 그 칸이 의미를 잃는다.
   * - **보완 요청·사용 중지·폐기**는 판단이다. 왜 그랬는지 남지 않으면
   *   나중에 아무도 설명할 수 없다.
   *
   * 이유를 안 받는 전환도 **이력에는 남는다.** 기본 문구를 서버가 넣는다 —
   * 요구사항 7번(상태 변경 이력)은 그대로 지킨다.
   */
  requiresReason: boolean;
}

export const TOOL_TRANSITIONS: readonly TransitionRule[] = [
  {
    from: 'DRAFT',
    to: 'SUBMITTED',
    allowsOwner: true,
    requiredPermission: null,
    label: '등록 신청',
    destructive: false,
    requiresReason: false,
  },
  {
    from: 'SUBMITTED',
    to: 'HUMAN_REVIEW',
    allowsOwner: false,
    requiredPermission: 'REVIEW',
    label: '검토 시작',
    destructive: false,
    requiresReason: false,
  },
  {
    /*
     * 신청 취소 (리뷰 2026-08-27 3절).
     *
     * "개발자가 자신이 올린 글을 수정할 수 있는 권한과 기능이 있어야 함."
     *
     * 신청해 놓고 검토가 시작되기 전까지는 만든 사람이 손볼 수 있어야 한다.
     * 이 길이 없으면 오타 하나를 고치려고 검토자에게 부탁해야 하고,
     * 검토자는 보완 요청을 눌러 줘야 한다. 둘 다 할 일이 아니다.
     *
     * **검토가 시작된 뒤(HUMAN_REVIEW)에는 없다.** 검토자가 읽고 있는 내용이
     * 발밑에서 바뀌면 안 된다.
     */
    from: 'SUBMITTED',
    to: 'DRAFT',
    allowsOwner: true,
    requiredPermission: null,
    label: '신청 취소하고 수정',
    destructive: false,
    requiresReason: false,
  },
  {
    from: 'HUMAN_REVIEW',
    to: 'REVISION_REQUIRED',
    allowsOwner: false,
    requiredPermission: 'REVIEW',
    label: '보완 요청',
    destructive: false,
    requiresReason: true,
  },
  {
    from: 'REVISION_REQUIRED',
    to: 'SUBMITTED',
    allowsOwner: true,
    requiredPermission: null,
    label: '보완 후 재신청',
    destructive: false,
    requiresReason: false,
  },
  {
    from: 'HUMAN_REVIEW',
    to: 'PILOT',
    allowsOwner: false,
    requiredPermission: 'REVIEW',
    label: '시범운영 승인',
    destructive: false,
    requiresReason: false,
  },
  {
    from: 'PILOT',
    to: 'APPROVED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '정식 승인',
    destructive: false,
    requiresReason: false,
  },
  {
    from: 'APPROVED',
    to: 'SUSPENDED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '사용 중지',
    destructive: true,
    requiresReason: true,
  },
  {
    from: 'SUSPENDED',
    to: 'APPROVED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '사용 재개',
    destructive: false,
    requiresReason: true,
  },
  {
    from: 'APPROVED',
    to: 'RETIRED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '폐기',
    destructive: true,
    requiresReason: true,
  },
  {
    from: 'SUSPENDED',
    to: 'RETIRED',
    allowsOwner: false,
    requiredPermission: 'MANAGE_TOOLS',
    label: '폐기',
    destructive: true,
    requiresReason: true,
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

/**
 * 판단이 담긴 전환에는 이유를 반드시 남긴다 (요구사항 7번).
 *
 * 착수에 불과한 전환(검토 시작·재신청 등)은 묻지 않는다 — 매번 "확인하겠습니다"를
 * 치게 하면 그 칸이 의미를 잃는다. 어느 쪽인지는 `TransitionRule.requiresReason`
 * 이 정한다.
 */
export function assertReasonProvided(from: ToolStatus, to: ToolStatus, reason: string): void {
  const rule = findTransition(from, to);
  if (rule && !rule.requiresReason) return;

  if (reason.trim().length < 5) {
    throw new DomainError(
      'VALIDATION_FAILED',
      '상태 변경 이유를 5자 이상 입력해 주세요. 나중에 이력에서 왜 바뀌었는지 확인할 수 있어야 합니다.',
      { reason: '5자 이상 입력해 주세요.' },
    );
  }
}

/**
 * 이유를 안 받는 전환의 이력 문구.
 *
 * **비워 두지 않는다.** 이력에 빈 줄이 남으면 "왜 바뀌었지"에 답할 수 없고,
 * 요구사항 7번(상태 변경 이력)이 무너진다. 사람에게 묻지 않을 뿐이다.
 */
export function defaultReason(to: ToolStatus): string {
  switch (to) {
    case 'SUBMITTED':
      return '검토를 위해 등록을 신청했습니다.';
    case 'HUMAN_REVIEW':
      return '검토를 시작했습니다.';
    case 'DRAFT':
      return '내용을 고치기 위해 신청을 취소했습니다.';
    case 'PILOT':
      return '검토를 마치고 시범운영으로 넘겼습니다.';
    case 'APPROVED':
      return '시범운영 결과를 확인하고 정식 승인했습니다.';
    default:
      return '상태를 변경했습니다.';
  }
}
