import type { AccountType, AdminPermission, MemberType } from '../authz/accounts';
import type { CampusId, UserId } from '../shared/ids';

export interface Campus {
  id: CampusId;
  name: string;
  shortName: string;
  createdAt: string;
}

export interface Profile {
  id: UserId;
  campusId: CampusId;
  email: string;
  name: string;
  /** 직위·직급 표시용 */
  title: string;
  /** 이용자인가 관리자인가 */
  accountType: AccountType;
  /**
   * 관리자에게 부여된 세부 권한.
   * 이용자 계정은 항상 빈 배열이다 — 계정 종류를 이용자로 바꾸면 함께 비운다.
   */
  adminPermissions: AdminPermission[];
  /** 학내 신분. 권한이 아니라 "누구에게 맞는 도구인지"를 가리는 데 쓴다. */
  memberType: MemberType;
  isActive: boolean;
  /** DEMO 계정인지 표시 — 화면에서 운영 계정과 구분한다 (요구사항 18번) */
  isDemoAccount: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** 화면에 표시할 최소 사용자 정보 */
export interface UserSummary {
  id: UserId;
  name: string;
  email: string;
  accountType: AccountType;
  memberType: MemberType;
}

export function toUserSummary(profile: Profile): UserSummary {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    accountType: profile.accountType,
    memberType: profile.memberType,
  };
}
