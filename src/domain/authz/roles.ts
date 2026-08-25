export const USER_ROLES = ['REQUESTER', 'DEVELOPER', 'REVIEWER', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  REQUESTER: '수요자',
  DEVELOPER: '개발자',
  REVIEWER: '검토자',
  ADMIN: '관리자',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  REQUESTER: '업무 자동화 수요를 등록하고 도구를 검색·평가하며 개선을 요청합니다.',
  DEVELOPER: '자동화 도구와 버전을 등록하고 개발 수요에 참여하며 개선 요청을 처리합니다.',
  REVIEWER: '등록된 도구를 검토하고 위험 체크리스트를 작성하며 시범운영·승인 의견을 냅니다.',
  ADMIN: '모든 데이터를 조회하고 역할을 관리하며 최종 승인·사용중지·폐기를 수행합니다.',
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * 역할 서열. 숫자가 클수록 넓은 권한.
 * 단순 서열만으로 모든 권한을 결정하지는 않는다 — 소유권 기반 규칙은 policies.ts 참고.
 */
const ROLE_RANK: Record<UserRole, number> = {
  REQUESTER: 1,
  DEVELOPER: 2,
  REVIEWER: 3,
  ADMIN: 4,
};

export function hasAtLeastRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
