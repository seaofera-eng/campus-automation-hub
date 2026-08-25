import 'server-only';
import type { AccountType, AdminPermission } from '@/domain/authz/accounts';
import { assertCan } from '@/domain/authz/policies';
import type { Profile } from '@/domain/identity/types';
import { conflict, notFound, preconditionFailed } from '@/domain/shared/errors';
import { asId, newId } from '@/domain/shared/ids';
import type { CampusId, CategoryId, UserId } from '@/domain/shared/ids';
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
  /** 이 사람이 담당하거나 개발한 도구 수 */
  toolCount: number;
}

export async function listUsers(): Promise<{
  actor: Profile;
  users: AdminUserRow[];
}> {
  const actor = await requireUser();
  assertCan(toActor(actor), 'admin:users');

  const repositories = getRepositories();
  const [profiles, toolPage] = await Promise.all([
    repositories.identity.listProfiles(actor.campusId),
    repositories.tools.listTools({ campusId: actor.campusId }, 'RECENT', {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    }),
  ]);

  const toolCounts = new Map<string, number>();
  for (const tool of toolPage.items) {
    for (const userId of new Set([tool.ownerUserId, ...tool.developerUserIds])) {
      toolCounts.set(userId, (toolCounts.get(userId) ?? 0) + 1);
    }
  }

  return {
    actor,
    users: profiles
      .map((profile) => ({
        profile,
        toolCount: toolCounts.get(profile.id) ?? 0,
      }))
      .sort((a, b) => a.profile.name.localeCompare(b.profile.name, 'ko')),
  };
}

export interface ChangeAccountPermissionsInput {
  userId: string;
  accountType: AccountType;
  adminPermissions: readonly AdminPermission[];
}

export async function changeAccountPermissions(
  actor: Profile,
  input: ChangeAccountPermissionsInput,
): Promise<Profile> {
  assertCan(toActor(actor), 'admin:users');

  const targetId = asId<UserId>(input.userId);

  // 자기 권한은 스스로 바꿀 수 없다. 관리자가 실수로 자기 권한을 낮춰
  // 아무도 관리할 수 없게 되는 상황을 막고, 권한 상승을 혼자 처리하지 못하게 한다.
  // (Supabase RLS 의 user_roles_admin_write 정책도 같은 조건을 건다.)
  if (targetId === actor.id) {
    throw preconditionFailed('자신의 권한은 직접 바꿀 수 없습니다. 다른 관리자에게 요청해 주세요.');
  }

  const repositories = getRepositories();
  const profile = await repositories.identity.getProfile(targetId);
  if (!profile || profile.deletedAt !== null) throw notFound('사용자');

  // 이용자로 내리면 관리 권한은 함께 비운다. 둘이 어긋난 상태를 만들지 않는다.
  const permissions = input.accountType === 'USER' ? [] : [...input.adminPermissions];

  if (profile.accountType === input.accountType && sameSet(profile.adminPermissions, permissions)) {
    throw conflict('이미 같은 권한입니다. 바꿀 내용이 없습니다.');
  }

  // "마지막 관리자를 내리지 못하게" 하는 검사는 따로 두지 않는다.
  // 이 함수를 부르려면 행위자가 계정 관리 권한을 가져야 하고 자기 권한은 못 바꾸므로,
  // 어떤 경우에도 행위자 본인이 관리자로 남는다. 검사를 넣으면 오히려
  // 비활성 관리자를 정리하는 정상적인 작업까지 막힌다.

  return repositories.identity.updateProfile({
    ...profile,
    accountType: input.accountType,
    adminPermissions: permissions,
    updatedAt: new Date().toISOString(),
  });
}

function sameSet(a: readonly AdminPermission[], b: readonly AdminPermission[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

export interface UpdateUserInput {
  userId: string;
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
    title: input.title,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
  });
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
