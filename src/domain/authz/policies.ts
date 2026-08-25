import { forbidden } from '../shared/errors';
import type { CampusId, DepartmentId, UserId } from '../shared/ids';
import type { ToolStatus, VisibilityScope } from '../tool/types';
import type { PermissionAction } from './actions';
import type { UserRole } from './roles';

/**
 * 권한 정책 — 단일 진실 원천.
 *
 * UI에서 버튼을 숨기는 것과 **무관하게** 모든 서버 액션이 이 함수를 통과해야 한다.
 * (요구사항 5번: "권한 검사는 화면에서만 하지 않는다. 서버 측에서도 반드시 검사한다.")
 *
 * Supabase 모드에서는 RLS 정책이 두 번째 방어선으로 동작한다.
 */

export interface Actor {
  id: UserId;
  role: UserRole;
  departmentId: DepartmentId | null;
  campusId: CampusId;
}

export interface ResourceContext {
  /** 리소스를 만든 사람 또는 담당자 */
  ownerId?: UserId | null;
  /** 도구 개발자 목록 */
  developerIds?: readonly UserId[];
  /** 리소스가 속한 부서 */
  departmentId?: DepartmentId | null;
  /** 배정된 담당자 (리뷰어 / 개선요청 담당 개발자) */
  assigneeId?: UserId | null;
  /** 도구 상태 — 읽기 범위 판단에 사용 */
  toolStatus?: ToolStatus;
  /** 공개 범위 */
  visibility?: VisibilityScope;
}

function isOwnerOrDeveloper(actor: Actor, context: ResourceContext): boolean {
  if (context.ownerId && context.ownerId === actor.id) return true;
  if (context.developerIds?.includes(actor.id)) return true;
  return false;
}

function isSameDepartment(actor: Actor, context: ResourceContext): boolean {
  return (
    actor.departmentId !== null &&
    context.departmentId != null &&
    actor.departmentId === context.departmentId
  );
}

/**
 * 도구 읽기 권한.
 * - 관리자·검토자는 모두 볼 수 있다 (검토가 업무이므로).
 * - 담당자·개발자는 자기 도구를 항상 볼 수 있다.
 * - 그 외에는 DRAFT가 아니면서 공개 범위에 해당해야 한다.
 */
function canReadTool(actor: Actor, context: ResourceContext): boolean {
  if (actor.role === 'ADMIN' || actor.role === 'REVIEWER') return true;
  if (isOwnerOrDeveloper(actor, context)) return true;

  if (context.toolStatus === 'DRAFT') return false;

  switch (context.visibility) {
    case 'PUBLIC':
    case 'CAMPUS':
      return true;
    case 'DEPARTMENT':
      return isSameDepartment(actor, context);
    case 'PRIVATE':
      return false;
    default:
      // 공개 범위가 지정되지 않은 경우는 보수적으로 교내 공개로 본다.
      return true;
  }
}

/**
 * 이 행위자가 해당 동작을 수행할 수 있는가.
 *
 * 상태 전환 가능 여부까지는 판단하지 않는다 — 그것은 각 상태머신의 몫이다.
 * 여기서는 "이 화면/액션에 접근할 자격이 있는가"만 본다.
 */
export function can(
  actor: Actor,
  action: PermissionAction,
  context: ResourceContext = {},
): boolean {
  const isAdmin = actor.role === 'ADMIN';
  if (isAdmin) {
    // 관리자는 모든 동작을 수행할 수 있다. 단, 감사 로그에서 제외되지 않는다.
    return true;
  }

  switch (action) {
    /* ---------------------------------------------------------------- 도구 */
    case 'tool:create':
      return actor.role === 'DEVELOPER';

    case 'tool:read':
      return canReadTool(actor, context);

    case 'tool:update':
    case 'tool:attach':
      return actor.role === 'DEVELOPER' && isOwnerOrDeveloper(actor, context);

    case 'tool:submit':
    case 'tool:createVersion':
      return actor.role === 'DEVELOPER' && isOwnerOrDeveloper(actor, context);

    case 'tool:transition':
      // 검토자는 검토 흐름의 상태를 바꿀 수 있고,
      // 개발자는 자기 도구의 신청 관련 전환만 할 수 있다.
      // 어떤 전환이 실제로 허용되는지는 status-machine 이 다시 검증한다.
      if (actor.role === 'REVIEWER') return true;
      return actor.role === 'DEVELOPER' && isOwnerOrDeveloper(actor, context);

    case 'tool:suspend':
    case 'tool:retire':
      // 사용 중지·폐기는 관리자 전용 (요구사항 5번)
      return false;

    /* ---------------------------------------------------------------- 검토 */
    case 'review:list':
    case 'review:comment':
    case 'review:checklist':
      return actor.role === 'REVIEWER';

    case 'review:assign':
      // 검토자는 자기 자신에게만 배정할 수 있다.
      return actor.role === 'REVIEWER' && (context.assigneeId ?? actor.id) === actor.id;

    /* ---------------------------------------------------------------- 수요 */
    case 'demand:create':
    case 'demand:read':
      return true;

    case 'demand:update':
      return context.ownerId === actor.id;

    case 'demand:transition':
      // 등록자 본인 또는 검토자. 어떤 전환이 되는지는 상태머신이 판단한다.
      return context.ownerId === actor.id || actor.role === 'REVIEWER';

    case 'demand:match':
      // 요구사항 8번: 관리자 또는 검토자만 수요와 도구를 연결한다.
      return actor.role === 'REVIEWER';

    case 'demand:participate':
      return actor.role === 'DEVELOPER';

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
      if (actor.role === 'REVIEWER') return true;
      if (context.assigneeId === actor.id) return true;
      if (context.ownerId === actor.id) return true;
      return actor.role === 'DEVELOPER' && isOwnerOrDeveloper(actor, context);

    case 'improvement:assign':
      if (actor.role === 'REVIEWER') return true;
      return actor.role === 'DEVELOPER' && (context.developerIds?.includes(actor.id) ?? false);

    /* -------------------------------------------------------------- 관리자 */
    case 'admin:dashboard':
    case 'admin:users':
    case 'admin:departments':
    case 'admin:categories':
    case 'admin:auditLogs':
      return false;

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
      `이 작업(${action})을 수행할 권한이 없습니다. 현재 역할로는 접근할 수 없습니다. 필요하다면 관리자에게 역할 변경을 요청해 주세요.`,
    );
  }
}
