'use server';

import { revalidatePath } from 'next/cache';
import {
  changeUserRole,
  deleteDepartment,
  updateUser,
  upsertCategory,
  upsertDepartment,
} from '@/application/admin/manage';
import { withAudit } from '@/application/shared/audit';
import { USER_ROLE_LABELS } from '@/domain/authz/roles';
import { run, type ActionResult } from '@/lib/actions/result';
import { requireUser } from '@/lib/auth/current-user';
import {
  changeUserRoleSchema,
  deleteDepartmentSchema,
  updateUserSchema,
  upsertCategorySchema,
  upsertDepartmentSchema,
} from '@/lib/validation/admin';
import { parseOrThrow } from '@/lib/validation/common';

/**
 * 관리자 서버 액션.
 *
 * 요구사항 18번: **관리자 작업도 감사 로그에서 제외하지 않는다.**
 * 특히 역할 변경은 권한 자체를 바꾸는 일이라 사유까지 함께 남긴다.
 */

export async function changeUserRoleAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(changeUserRoleSchema, input);

    await withAudit(
      actor,
      {
        action: 'admin.changeUserRole',
        targetType: 'user',
        targetId: data.userId,
        changedFields: ['role'],
        // 역할과 사유는 값 자체가 감사 기록의 목적이므로 요약에 넣는다.
        // 개인정보가 아니라 권한 변경 근거다.
        summary: `역할을 '${USER_ROLE_LABELS[data.role]}'(으)로 변경했습니다. 사유: ${data.reason}`,
      },
      () => changeUserRole(actor, data.userId, data.role),
    );

    revalidatePath('/admin/users');
    return null;
  });
}

export async function updateUserAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(updateUserSchema, input);

    await withAudit(
      actor,
      {
        action: 'admin.updateUser',
        targetType: 'user',
        targetId: data.userId,
        changedFields: ['departmentId', 'title', 'isActive'],
        summary: data.isActive ? '사용자 정보를 수정했습니다.' : '사용자를 비활성화했습니다.',
      },
      () =>
        updateUser(actor, {
          userId: data.userId,
          departmentId: data.departmentId,
          title: data.title,
          isActive: data.isActive,
        }),
    );

    revalidatePath('/admin/users');
    return null;
  });
}

export async function upsertDepartmentAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(upsertDepartmentSchema, input);

    await withAudit(
      actor,
      {
        action: data.departmentId ? 'admin.updateDepartment' : 'admin.createDepartment',
        targetType: 'department',
        targetId: data.departmentId || null,
        changedFields: ['name', 'code', 'parentId', 'sortOrder'],
        summary: data.departmentId ? '부서 정보를 수정했습니다.' : '부서를 추가했습니다.',
      },
      () =>
        upsertDepartment(actor, {
          departmentId: data.departmentId,
          name: data.name,
          code: data.code,
          parentId: data.parentId,
          sortOrder: data.sortOrder,
        }),
    );

    revalidatePath('/admin/departments');
    return null;
  });
}

export async function deleteDepartmentAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(deleteDepartmentSchema, input);

    await withAudit(
      actor,
      {
        action: 'admin.deleteDepartment',
        targetType: 'department',
        targetId: data.departmentId,
        changedFields: ['deletedAt'],
        summary: '부서를 삭제했습니다.',
      },
      () => deleteDepartment(actor, data.departmentId),
    );

    revalidatePath('/admin/departments');
    return null;
  });
}

export async function upsertCategoryAction(input: unknown): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requireUser();
    const data = parseOrThrow(upsertCategorySchema, input);

    await withAudit(
      actor,
      {
        action: data.categoryId ? 'admin.updateCategory' : 'admin.createCategory',
        targetType: 'category',
        targetId: data.categoryId || null,
        changedFields: ['name', 'code', 'description', 'sortOrder', 'isActive'],
        summary: data.categoryId ? '카테고리를 수정했습니다.' : '카테고리를 추가했습니다.',
      },
      () =>
        upsertCategory(actor, {
          categoryId: data.categoryId,
          name: data.name,
          code: data.code,
          description: data.description,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        }),
    );

    revalidatePath('/admin/categories');
    revalidatePath('/tools');
    return null;
  });
}
