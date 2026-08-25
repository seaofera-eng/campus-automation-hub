import 'server-only';
import { assertCan } from '@/domain/authz/policies';
import type { UserRole } from '@/domain/authz/roles';
import { USER_ROLE_LABELS } from '@/domain/authz/roles';
import type { Department, Profile } from '@/domain/identity/types';
import { conflict, notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { CampusId, CategoryId, DepartmentId, UserId } from '@/domain/shared/ids';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import type { ToolCategory } from '@/domain/tool/types';
import { requireUser, toActor } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';

/**
 * 관리자 운영 작업 (요구사항 11번).
 *
 * 여기의 모든 작업은 서버 액션에서 `withAudit()` 으로 감싼다.
 * **관리자 작업이라고 감사 로그에서 빠지지 않는다** (요구사항 18번).
 */

/* -------------------------------------------------------------------------- */
/* 사용자 · 역할                                                               */
/* -------------------------------------------------------------------------- */

export interface AdminUserRow {
  profile: Profile;
  departmentName: string | null;
  /** 이 사람이 담당하거나 개발한 도구 수 */
  toolCount: number;
}

export async function listUsers(): Promise<{
  actor: Profile;
  users: AdminUserRow[];
  departments: Department[];
}> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'admin:users');

  const repositories = getRepositories();
  const [profiles, departments, toolPage] = await Promise.all([
    repositories.identity.listProfiles(actor.campusId),
    repositories.identity.listDepartments(actor.campusId),
    repositories.tools.listTools({ campusId: actor.campusId }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    }),
  ]);

  const departmentNames = new Map(departments.map((d) => [d.id, d.name]));
  const toolCounts = new Map<string, number>();
  for (const tool of toolPage.items) {
    for (const userId of new Set([tool.ownerUserId, ...tool.developerUserIds])) {
      toolCounts.set(userId, (toolCounts.get(userId) ?? 0) + 1);
    }
  }

  return {
    actor,
    departments,
    users: profiles
      .map((profile) => ({
        profile,
        departmentName: profile.departmentId
          ? (departmentNames.get(profile.departmentId) ?? null)
          : null,
        toolCount: toolCounts.get(profile.id) ?? 0,
      }))
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name, 'ko')),
  };
}

export async function changeUserRole(
  actor: Profile,
  userId: string,
  role: UserRole,
): Promise<Profile> {
  assertCan(toActor(actor), 'admin:users');

  const targetId = asId<UserId>(userId);

  // 자기 역할은 스스로 바꿀 수 없다. 관리자가 실수로 자기 권한을 낮춰
  // 아무도 관리할 수 없게 되는 상황을 막고, 권한 상승을 혼자 처리하지 못하게 한다.
  // (Supabase RLS 의 user_roles_admin_write 정책도 같은 조건을 건다.)
  if (targetId === actor.id) {
    throw preconditionFailed(
      '자신의 역할은 직접 바꿀 수 없습니다. 다른 관리자에게 요청해 주세요.',
    );
  }

  const repositories = getRepositories();
  const profile = await repositories.identity.getProfile(targetId);
  if (!profile || profile.deletedAt !== null) throw notFound('사용자');

  if (profile.role === role) {
    throw conflict(`이미 '${USER_ROLE_LABELS[role]}' 역할입니다.`);
  }

  // "마지막 관리자를 내리지 못하게" 하는 검사는 따로 두지 않는다.
  // 이 함수를 부르려면 행위자가 관리자여야 하고 자기 역할은 못 바꾸므로,
  // 어떤 경우에도 행위자 본인이 관리자로 남는다. 검사를 넣으면 오히려
  // 비활성 관리자를 정리하는 정상적인 작업까지 막힌다.

  return repositories.identity.updateProfile({
    ...profile,
    role,
    updatedAt: new Date().toISOString(),
  });
}

export interface UpdateUserInput {
  userId: string;
  departmentId: string;
  title: string;
  isActive: boolean;
}

export async function updateUser(actor: Profile, input: UpdateUserInput): Promise<Profile> {
  assertCan(toActor(actor), 'admin:users');

  const repositories = getRepositories();
  const targetId = asId<UserId>(input.userId);
  const profile = await repositories.identity.getProfile(targetId);
  if (!profile || profile.deletedAt !== null) throw notFound('사용자');

  // 자기 계정을 스스로 비활성화하면 즉시 로그아웃되어 되돌릴 수 없다.
  if (targetId === actor.id && !input.isActive) {
    throw preconditionFailed('자신의 계정은 비활성화할 수 없습니다.');
  }

  return repositories.identity.updateProfile({
    ...profile,
    departmentId: input.departmentId ? asId<DepartmentId>(input.departmentId) : null,
    title: input.title,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  });
}

/* -------------------------------------------------------------------------- */
/* 부서                                                                        */
/* -------------------------------------------------------------------------- */

export async function listDepartmentsForAdmin(): Promise<{
  actor: Profile;
  departments: (Department & { memberCount: number; toolCount: number })[];
}> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'admin:departments');

  const repositories = getRepositories();
  const [departments, profiles, toolPage] = await Promise.all([
    repositories.identity.listDepartments(actor.campusId),
    repositories.identity.listProfiles(actor.campusId),
    repositories.tools.listTools({ campusId: actor.campusId }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    }),
  ]);

  return {
    actor,
    departments: departments.map((department) => ({
      ...department,
      memberCount: profiles.filter((profile) => profile.departmentId === department.id).length,
      toolCount: toolPage.items.filter((tool) => tool.departmentId === department.id).length,
    })),
  };
}

export interface UpsertDepartmentInput {
  departmentId: string;
  name: string;
  code: string;
  parentId: string;
  sortOrder: number;
}

export async function upsertDepartment(
  actor: Profile,
  input: UpsertDepartmentInput,
): Promise<Department> {
  assertCan(toActor(actor), 'admin:departments');

  const repositories = getRepositories();
  const existing = input.departmentId
    ? await repositories.identity.getDepartment(asId<DepartmentId>(input.departmentId))
    : null;

  if (input.departmentId && !existing) throw notFound('부서');

  // 자기 자신을 상위 부서로 지정하면 순환이 된다.
  if (input.parentId && input.parentId === input.departmentId) {
    throw preconditionFailed('자기 자신을 상위 부서로 지정할 수 없습니다.');
  }

  const now = new Date().toISOString();
  return repositories.identity.upsertDepartment({
    id: existing?.id ?? newId<DepartmentId>(),
    campusId: actor.campusId as CampusId,
    name: input.name,
    code: input.code,
    parentId: input.parentId ? asId<DepartmentId>(input.parentId) : null,
    sortOrder: input.sortOrder,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  });
}

export async function deleteDepartment(actor: Profile, departmentId: string): Promise<void> {
  assertCan(toActor(actor), 'admin:departments');

  const repositories = getRepositories();
  const id = asId<DepartmentId>(departmentId);
  const department = await repositories.identity.getDepartment(id);
  if (!department || department.deletedAt !== null) throw notFound('부서');

  // 소속된 사람이나 도구가 있으면 지우지 않는다. 지우면 그들의 소속이 사라진다.
  const [profiles, toolPage] = await Promise.all([
    repositories.identity.listProfiles(actor.campusId),
    repositories.tools.listTools({ campusId: actor.campusId, departmentIds: [id] }, 'RECENT', {
      page: 1,
      pageSize: 1,
    }),
  ]);

  const memberCount = profiles.filter((profile) => profile.departmentId === id).length;
  if (memberCount > 0) {
    throw conflict(
      `이 부서에 ${memberCount}명이 소속되어 있어 삭제할 수 없습니다. 소속을 먼저 옮겨 주세요.`,
    );
  }
  if (toolPage.totalItems > 0) {
    throw conflict(
      `이 부서에 등록된 도구가 ${toolPage.totalItems}건 있어 삭제할 수 없습니다. 담당 부서를 먼저 바꿔 주세요.`,
    );
  }

  await repositories.identity.softDeleteDepartment(id, new Date().toISOString());
}

/* -------------------------------------------------------------------------- */
/* 카테고리                                                                    */
/* -------------------------------------------------------------------------- */

export async function listCategoriesForAdmin(): Promise<{
  actor: Profile;
  categories: (ToolCategory & { toolCount: number })[];
}> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'admin:categories');

  const repositories = getRepositories();
  const [categories, toolPage] = await Promise.all([
    repositories.reference.listCategories(actor.campusId),
    repositories.tools.listTools({ campusId: actor.campusId }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    }),
  ]);

  return {
    actor,
    categories: categories.map((category) => ({
      ...category,
      toolCount: toolPage.items.filter((tool) => tool.categoryId === category.id).length,
    })),
  };
}

export interface UpsertCategoryInput {
  categoryId: string;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export async function upsertCategory(
  actor: Profile,
  input: UpsertCategoryInput,
): Promise<ToolCategory> {
  assertCan(toActor(actor), 'admin:categories');

  const repositories = getRepositories();
  const existing = input.categoryId
    ? await repositories.reference.getCategory(asId<CategoryId>(input.categoryId))
    : null;

  if (input.categoryId && !existing) throw notFound('카테고리');

  const now = new Date().toISOString();
  return repositories.reference.upsertCategory({
    id: existing?.id ?? newId<CategoryId>(),
    campusId: actor.campusId as CampusId,
    code: input.code,
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}
