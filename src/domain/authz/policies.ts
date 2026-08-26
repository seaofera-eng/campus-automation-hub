import { forbidden } from '../shared/errors';
import type { CampusId, UserId } from '../shared/ids';
import type { ToolStatus } from '../tool/types';
import type { AccountType, AdminPermission } from './accounts';
import { hasAdminPermission } from './accounts';
import type { PermissionAction } from './actions';

/**
 * 권한 정책 — 단일 진실 원천.
 *
 * UI에서 버튼을 숨기는 것과 **무관하게** 모든 서버 액션이 이 함수를 통과해야 한다.
 * (요구사항 5번: "권한 검사는 화면에서만 하지 않는다. 서버 측에서도 반드시 검사한다.")
 *
 * Supabase 모드에서는 RLS 정책이 두 번째 방어선으로 동작한다.
 *
 * 판단 기준은 두 가지뿐이다.
 *   1) 소유권 — 내가 만든 것인가
 *   2) 관리 권한 — 관리자로서 그 권한을 받았는가
 *
 * 이용자끼리는 서로 구분하지 않는다. 누구나 수요를 올리고 도구를 만든다.
 */

export interface Actor {
  id: UserId;
  accountType: AccountType;
  /** 관리자에게 부여된 세부 권한. 이용자는 항상 빈 배열. */
  adminPermissions: readonly AdminPermission[];
  campusId: CampusId;
}

export interface ResourceContext {
  /** 리소스를 만든 사람 또는 담당자 */
  ownerId?: UserId | null;
  /** 도구 개발자 목록 */
  developerIds?: readonly UserId[];
  /** 배정된 담당자 (검토자 / 개선요청 담당 개발자) */
  assigneeId?: UserId | null;
  /** 도구 상태 — 읽기 범위 판단에 사용 */
  toolStatus?: ToolStatus;
}

function isOwnerOrDeveloper(actor: Actor, context: ResourceContext): boolean {
  if (context.ownerId && context.ownerId === actor.id) return true;
  if (context.developerIds?.includes(actor.id)) return true;
  return false;
}

/** 관리자로서 해당 권한을 가졌는가 */
function may(actor: Actor, permission: AdminPermission): boolean {
  return hasAdminPermission(actor.accountType, actor.adminPermissions, permission);
}

/**
 * 도구 읽기 권한.
 *
 * 공개 범위 개념을 없앴다. 이 플랫폼에 올라오는 도구는 서로 보라고 공유하는 것이고,
 * 부서로 칸막이를 치면 "누가 이미 만들었는지"를 못 찾아 같은 걸 또 만들게 된다.
 *
 * 남은 구분은 하나다. **작성 중인 임시저장은 만든 사람만 본다.**
 * 검토 권한을 가진 관리자는 검토가 업무이므로 볼 수 있다.
 */
function canReadTool(actor: Actor, context: ResourceContext): boolean {
  if (isOwnerOrDeveloper(actor, context)) return true;
  if (may(actor, 'REVIEW')) return true;
  return context.toolStatus !== 'DRAFT';
}

/**
 * 이 행위자가 해당 동작을 수행할 수 있는가.
 *
 * 상태 전환 가능 여부까지는 판단하지 않는다 — 그것은 각 상태머신의 몫이다.
 * 여기서는 "이 화면/액션에 접근할 자격이 있는가"만 본다.
 */
export function can(actor: Actor, action: PermissionAction, context: ResourceContext = {}): boolean {
  switch (action) {
    /* ---------------------------------------------------------------- 도구 */
    case 'tool:create':
      // 누구나 도구를 만들어 공유할 수 있다.
      return true;

    case 'tool:read':
      return canReadTool(actor, context);

    case 'tool:update':
    case 'tool:attach':
    case 'tool:submit':
    case 'tool:createVersion':
      return isOwnerOrDeveloper(actor, context);

    case 'tool:transition':
      // 검토 권한자는 검토 흐름의 상태를 바꿀 수 있고,
      // 만든 사람은 자기 도구의 신청 관련 전환만 할 수 있다.
      // 어떤 전환이 실제로 허용되는지는 status-machine 이 다시 검증한다.
      return may(actor, 'REVIEW') || isOwnerOrDeveloper(actor, context);

    case 'tool:suspend':
    case 'tool:retire':
      // 남이 쓰고 있는 도구를 내리는 일이라 운영 권한이 따로 필요하다.
      return may(actor, 'MANAGE_TOOLS');

    /* ---------------------------------------------------------------- 검토 */
    case 'review:list':
    case 'review:comment':
    case 'review:checklist':
      return may(actor, 'REVIEW');

    case 'review:assign':
      // 검토자는 자기 자신에게만 배정한다. 남에게 넘기는 것은 계정 관리 권한이 있어야 한다.
      if (!may(actor, 'REVIEW')) return false;
      if ((context.assigneeId ?? actor.id) === actor.id) return true;
      return may(actor, 'MANAGE_USERS');

    /* ---------------------------------------------------------------- 수요 */
    case 'demand:create':
    case 'demand:read':
    case 'demand:participate':
      // 누구나 수요를 올리고, 남의 수요 개발에 참여할 수 있다.
      return true;

    case 'demand:update':
      return context.ownerId === actor.id;

    case 'demand:transition':
      // 등록자 본인 또는 검토 권한자. 어떤 전환이 되는지는 상태머신이 판단한다.
      return context.ownerId === actor.id || may(actor, 'REVIEW');

    case 'demand:match':
      // 수요와 도구를 잇는 판단은 검토 권한을 받은 사람이 한다.
      return may(actor, 'REVIEW');

    /* ---------------------------------------------------------------- 평가 */
    case 'evaluation:read':
    case 'evaluation:create':
      return true;

    case 'evaluation:update':
      // 자기가 쓴 평가만 수정할 수 있다. 수정 이력은 항상 남는다.
      return context.ownerId === actor.id;

    /* ------------------------------------------------------------ 개선요청 */
    case 'improvement:create':
    case 'improvement:read':
      return true;

    case 'improvement:transition':
      if (may(actor, 'REVIEW')) return true;
      if (context.assigneeId === actor.id) return true;
      if (context.ownerId === actor.id) return true;
      return isOwnerOrDeveloper(actor, context);

    case 'improvement:assign':
      if (may(actor, 'REVIEW')) return true;
      return isOwnerOrDeveloper(actor, context);

    /* -------------------------------------------------------------- 관리자 */
    case 'admin:dashboard':
      // 관리 권한을 하나라도 가진 관리자만 관리 화면에 들어간다.
      return actor.accountType === 'ADMIN' && actor.adminPermissions.length > 0;

    case 'admin:users':
      return may(actor, 'MANAGE_USERS');

    case 'admin:categories':
      return may(actor, 'MANAGE_CATEGORIES');

    case 'admin:auditLogs':
      return may(actor, 'VIEW_AUDIT');

    case 'admin:notices':
      return may(actor, 'MANAGE_NOTICES');

    case 'admin:consolidation':
      // 통합은 남의 도구를 고치자는 제안이다. 도구 관리 권한이 있어야 한다.
      return may(actor, 'MANAGE_TOOLS');

    default: {
      // 새 동작을 actions.ts 에 추가하고 여기에 규칙을 넣지 않으면 컴파일 오류가 난다.
      const exhaustive: never = action;
      throw new Error(`권한 규칙이 정의되지 않은 동작입니다: ${String(exhaustive)}`);
    }
  }
}

/** 권한이 없으면 DomainError('FORBIDDEN')를 던진다. 서버 액션의 표준 진입 검사. */
export function assertCan(
  actor: Actor,
  action: PermissionAction,
  context: ResourceContext = {},
): void {
  if (!can(actor, action, context)) {
    throw forbidden(
      `이 작업(${action})을 수행할 권한이 없습니다. 필요하다면 관리자에게 권한 부여를 요청해 주세요.`,
    );
  }
}
