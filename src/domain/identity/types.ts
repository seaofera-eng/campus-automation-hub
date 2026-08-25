import type { UserRole } from '../authz/roles';
import type { CampusId, DepartmentId, UserId } from '../shared/ids';

export interface Campus {
  id: CampusId;
  name: string;
  shortName: string;
  createdAt: string;
}

export interface Department {
  id: DepartmentId;
  campusId: CampusId;
  name: string;
  code: string;
  /** 상위 조직 (없으면 최상위) */
  parentId: DepartmentId | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Profile {
  id: UserId;
  campusId: CampusId;
  email: string;
  name: string;
  departmentId: DepartmentId | null;
  /** 직위·직급 표시용 */
  title: string;
  role: UserRole;
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
  role: UserRole;
  departmentId: DepartmentId | null;
  departmentName: string | null;
}

export function toUserSummary(profile: Profile, departmentName: string | null): UserSummary {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    departmentId: profile.departmentId,
    departmentName,
  };
}
