/**
 * 권한 검사 대상이 되는 모든 동작의 목록.
 *
 * 서버 액션은 반드시 이 중 하나를 지정해 requirePermission()을 호출한다.
 * 새 서버 액션을 만들면 여기에 동작을 추가하는 것이 첫 번째 단계다.
 */
export const PERMISSION_ACTIONS = [
  // 도구
  'tool:create',
  'tool:read',
  'tool:update',
  'tool:submit',
  'tool:createVersion',
  'tool:transition',
  'tool:suspend',
  'tool:retire',
  'tool:attach',

  // 검토
  'review:list',
  'review:assign',
  'review:comment',
  'review:checklist',

  // 수요
  'demand:create',
  'demand:read',
  'demand:update',
  'demand:transition',
  'demand:match',
  'demand:participate',

  // 평가
  'evaluation:create',
  'evaluation:update',
  'evaluation:read',

  // 개선 요청
  'improvement:create',
  'improvement:read',
  'improvement:transition',
  'improvement:assign',

  // 관리
  'admin:dashboard',
  'admin:users',
  'admin:categories',
  'admin:auditLogs',
  'admin:notices',
  'admin:consolidation',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
