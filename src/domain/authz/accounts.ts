/**
 * 계정 종류와 권한.
 *
 * 예전에는 역할 하나(수요자/개발자/검토자/관리자)가 권한과 신분을 겸했다.
 * 실제로는 한 사람이 수요도 올리고 도구도 만든다. 둘을 나눌 이유가 없었다.
 *
 * 그래서 축을 셋으로 나눈다.
 *   - AccountType     무엇을 할 수 있는가 (이용자 / 관리자)
 *   - AdminPermission 관리자가 어디까지 할 수 있는가
 *   - MemberType      학내에서 누구인가 (권한이 아니다)
 *
 * "자기가 만든 것만 고칠 수 있다"는 소유권 규칙은 이 축들과 무관하게 유지된다.
 * policies.ts 를 함께 보라.
 */

/* ------------------------------------------------------------------ 계정 종류 */

export const ACCOUNT_TYPES = ['USER', 'ADMIN'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  USER: '이용자',
  ADMIN: '관리자',
};

export const ACCOUNT_TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  USER: '필요한 업무 자동화를 요청하고, 직접 도구를 만들어 공유하며, 쓴 도구를 평가합니다.',
  ADMIN: '이용자가 할 수 있는 일에 더해, 부여받은 관리 권한 범위 안에서 검토와 운영을 맡습니다.',
};

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------- 관리자 세부 권한 */

/**
 * 관리자라고 해서 전부 할 수 있는 것은 아니다. 필요한 것만 부여한다.
 * 이용자(USER) 계정은 이 권한을 가질 수 없다.
 */
export const ADMIN_PERMISSIONS = [
  'REVIEW',
  'MANAGE_USERS',
  'MANAGE_CATEGORIES',
  'MANAGE_TOOLS',
  'MANAGE_NOTICES',
  'VIEW_AUDIT',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  REVIEW: '도구 검토',
  MANAGE_USERS: '계정 관리',
  MANAGE_CATEGORIES: '카테고리 관리',
  MANAGE_TOOLS: '도구 운영',
  MANAGE_NOTICES: '공지 관리',
  VIEW_AUDIT: '감사 로그 열람',
};

export const ADMIN_PERMISSION_DESCRIPTIONS: Record<AdminPermission, string> = {
  REVIEW: '등록된 도구를 검토하고 위험 체크리스트를 작성하며 수요에 도구를 연결합니다.',
  MANAGE_USERS: '계정의 권한을 바꾸고 사용을 중지합니다.',
  MANAGE_CATEGORIES: '도구 분류에 쓰는 카테고리를 관리합니다.',
  MANAGE_TOOLS: '문제가 있는 도구의 사용을 중지하거나 폐기합니다.',
  MANAGE_NOTICES: '공지를 쓰고 내립니다.',
  VIEW_AUDIT: '누가 무엇을 바꿨는지 기록을 봅니다.',
};

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

/* --------------------------------------------------------------------- 신분 */

/**
 * 학내에서 누구인가. **권한이 아니다.**
 * 회원가입 구분과, 도구·수요 목록의 "누구에게 맞는지" 표시에 쓴다.
 */
export const MEMBER_TYPES = ['STUDENT', 'STAFF', 'PROFESSOR', 'EXTERNAL'] as const;

export type MemberType = (typeof MEMBER_TYPES)[number];

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  STUDENT: '학생',
  STAFF: '교직원',
  PROFESSOR: '교수',
  EXTERNAL: '일반인',
};

export function isMemberType(value: unknown): value is MemberType {
  return typeof value === 'string' && (MEMBER_TYPES as readonly string[]).includes(value);
}

/* ----------------------------------------------------------------- 판단 도우미 */

/** 이 계정이 해당 관리 권한을 가졌는가. 이용자 계정은 언제나 false. */
export function hasAdminPermission(
  accountType: AccountType,
  permissions: readonly AdminPermission[],
  needed: AdminPermission,
): boolean {
  return accountType === 'ADMIN' && permissions.includes(needed);
}

/**
 * 관리 화면에 들어갈 수 있는가.
 * 관리자이면서 권한을 하나라도 가진 경우만 해당한다.
 * 권한이 하나도 없는 관리자 계정은 이용자와 같다.
 */
export function canEnterAdminArea(
  accountType: AccountType,
  permissions: readonly AdminPermission[],
): boolean {
  return accountType === 'ADMIN' && permissions.length > 0;
}

/**
 * 권한 판단에 필요한 최소 정보.
 *
 * 상태머신의 전환 컨텍스트들이 공통으로 요구한다. Profile 전체를 넘기지 않는 이유는
 * domain 이 identity 타입에 의존하지 않게 하기 위해서다.
 */
export interface PermissionHolder {
  accountType: AccountType;
  adminPermissions: readonly AdminPermission[];
}
