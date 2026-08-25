import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/domain/identity/types';
import type * as CurrentUserModule from '@/lib/auth/current-user';

/** 관리자 작업 (요구사항 11번·18번). */

let currentUser: Profile | null = null;

vi.mock('@/lib/auth/current-user', async (importOriginal) => {
  const actual = await importOriginal<typeof CurrentUserModule>();
  return {
    ...actual,
    getCurrentProfile: async () => currentUser,
    requireUser: async () => {
      if (!currentUser) throw new Error('테스트에서 로그인 사용자를 지정하지 않았습니다.');
      return currentUser;
    },
  };
});

const { listAuditLogs } = await import('@/application/admin/audit');
const {
  changeUserRole,
  deleteDepartment,
  listUsers,
  updateUser,
  upsertCategory,
  upsertDepartment,
} = await import('@/application/admin/manage');
const { withAudit } = await import('@/application/shared/audit');
const { saveDraft } = await import('@/application/tools/register');
const { getRepositories } = await import('@/lib/di/container');
const { parseAuditQuery } = await import('@/lib/validation/admin');
const { emptyToolForm } = await import('@/lib/validation/tool');
const { DEMO_DEPARTMENT_IDS } = await import('@/repositories/demo/seed-ids');
const { demoProfile, setupIsolatedStore, teardownIsolatedStore } = await import('./helpers');

beforeEach(() => {
  setupIsolatedStore();
  currentUser = null;
});
afterEach(() => {
  teardownIsolatedStore();
  currentUser = null;
});

async function signInAs(role: Parameters<typeof demoProfile>[0]): Promise<Profile> {
  currentUser = await demoProfile(role);
  return currentUser;
}

describe('접근 제어', () => {
  it('관리자가 아니면 사용자 목록을 볼 수 없다', async () => {
    for (const role of ['requester', 'developer', 'reviewer'] as const) {
      await signInAs(role);
      await expect(listUsers()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    await signInAs('admin');
    await expect(listUsers()).resolves.toBeTruthy();
  });

  it('관리자가 아니면 감사 로그를 볼 수 없다', async () => {
    await signInAs('reviewer');
    await expect(listAuditLogs(parseAuditQuery({}))).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('역할 변경', () => {
  it('관리자는 다른 사용자의 역할을 바꿀 수 있다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    const updated = await changeUserRole(admin, requester.id, 'DEVELOPER');
    expect(updated.role).toBe('DEVELOPER');
  });

  it('자기 역할은 스스로 바꿀 수 없다', async () => {
    const admin = await signInAs('admin');

    await expect(changeUserRole(admin, admin.id, 'REQUESTER')).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('자기 역할을 못 바꾸므로 관리자가 0명이 되는 일은 없다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    // 다른 사람을 관리자로 올린 뒤, 그 사람이 원래 관리자를 내릴 수 있다.
    // 이때도 내리는 쪽이 관리자로 남으므로 관리자가 사라지지 않는다.
    await changeUserRole(admin, requester.id, 'ADMIN');
    const newAdmin = await demoProfile('requester');
    expect(newAdmin.role).toBe('ADMIN');

    const demoted = await changeUserRole(newAdmin, admin.id, 'DEVELOPER');
    expect(demoted.role).toBe('DEVELOPER');

    const remaining = await getRepositories().identity.listProfiles(admin.campusId);
    expect(remaining.filter((item) => item.role === 'ADMIN').length).toBeGreaterThan(0);
  });

  it('같은 역할로는 바꿀 수 없다', async () => {
    const admin = await signInAs('admin');
    const developer = await demoProfile('developer');

    await expect(changeUserRole(admin, developer.id, 'DEVELOPER')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('검토자는 역할을 바꿀 수 없다', async () => {
    const reviewer = await signInAs('reviewer');
    const requester = await demoProfile('requester');

    await expect(changeUserRole(reviewer, requester.id, 'ADMIN')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('사용자 정보 수정', () => {
  it('자기 계정은 비활성화할 수 없다', async () => {
    const admin = await signInAs('admin');

    await expect(
      updateUser(admin, {
        userId: admin.id,
        departmentId: '',
        title: '',
        isActive: false,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('다른 사용자는 비활성화할 수 있다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    const updated = await updateUser(admin, {
      userId: requester.id,
      departmentId: requester.departmentId ?? '',
      title: requester.title,
      isActive: false,
    });
    expect(updated.isActive).toBe(false);
  });
});

describe('부서 관리', () => {
  it('부서를 추가하고 수정할 수 있다', async () => {
    const admin = await signInAs('admin');

    const created = await upsertDepartment(admin, {
      departmentId: '',
      name: '신설 지원과',
      code: 'NEW_SUPPORT',
      parentId: '',
      sortOrder: 10,
    });
    expect(created.name).toBe('신설 지원과');

    const updated = await upsertDepartment(admin, {
      departmentId: created.id,
      name: '개편 지원과',
      code: 'NEW_SUPPORT',
      parentId: '',
      sortOrder: 10,
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('개편 지원과');
  });

  it('자기 자신을 상위 부서로 지정할 수 없다', async () => {
    const admin = await signInAs('admin');
    const created = await upsertDepartment(admin, {
      departmentId: '',
      name: '순환 확인용',
      code: 'CYCLE',
      parentId: '',
      sortOrder: 0,
    });

    await expect(
      upsertDepartment(admin, {
        departmentId: created.id,
        name: '순환 확인용',
        code: 'CYCLE',
        parentId: created.id,
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('소속 인원이 있는 부서는 삭제할 수 없다', async () => {
    const admin = await signInAs('admin');

    await expect(
      deleteDepartment(admin, DEMO_DEPARTMENT_IDS.academicAffairs),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('도구가 있는 부서는 삭제할 수 없다', async () => {
    const admin = await signInAs('admin');
    const developer = await demoProfile('developer');

    const department = await upsertDepartment(admin, {
      departmentId: '',
      name: '도구만 있는 부서',
      code: 'TOOL_ONLY',
      parentId: '',
      sortOrder: 0,
    });

    await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '이 부서 도구', departmentId: department.id },
    });

    await expect(deleteDepartment(admin, department.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('비어 있는 부서는 삭제할 수 있다', async () => {
    const admin = await signInAs('admin');
    const department = await upsertDepartment(admin, {
      departmentId: '',
      name: '빈 부서',
      code: 'EMPTY',
      parentId: '',
      sortOrder: 0,
    });

    await deleteDepartment(admin, department.id);

    const remaining = await getRepositories().identity.listDepartments(admin.campusId);
    expect(remaining.some((item) => item.id === department.id)).toBe(false);
  });
});

describe('카테고리 관리', () => {
  it('카테고리를 추가하고 비활성화할 수 있다', async () => {
    const admin = await signInAs('admin');

    const created = await upsertCategory(admin, {
      categoryId: '',
      name: '신규 분류',
      code: 'NEW_CAT',
      description: '설명',
      sortOrder: 9,
      isActive: true,
    });
    expect(created.isActive).toBe(true);

    const deactivated = await upsertCategory(admin, {
      categoryId: created.id,
      name: '신규 분류',
      code: 'NEW_CAT',
      description: '설명',
      sortOrder: 9,
      isActive: false,
    });
    expect(deactivated.isActive).toBe(false);

    // 비활성 카테고리는 등록 화면 선택지에서 빠진다.
    const active = await getRepositories().reference.listCategories(admin.campusId);
    expect(active.some((item) => item.id === created.id)).toBe(false);
  });
});

describe('감사 로그 (요구사항 18번)', () => {
  it('관리자 작업도 감사 로그에 남는다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    await withAudit(
      admin,
      {
        action: 'admin.changeUserRole',
        targetType: 'user',
        targetId: requester.id,
        changedFields: ['role'],
        summary: '역할 변경 테스트',
      },
      () => changeUserRole(admin, requester.id, 'DEVELOPER'),
    );

    const result = await listAuditLogs(parseAuditQuery({}));
    const entry = result.page.items.find((row) => row.log.action === 'admin.changeUserRole');

    expect(entry).toBeTruthy();
    expect(entry?.log.actorUserId).toBe(admin.id);
    expect(entry?.log.outcome).toBe('SUCCESS');
  });

  it('실패한 작업도 기록된다', async () => {
    const admin = await signInAs('admin');

    await expect(
      withAudit(
        admin,
        {
          action: 'admin.changeUserRole',
          targetType: 'user',
          targetId: admin.id,
          changedFields: ['role'],
        },
        // 자기 역할 변경은 막히는 작업이다.
        () => changeUserRole(admin, admin.id, 'REQUESTER'),
      ),
    ).rejects.toBeTruthy();

    const result = await listAuditLogs(parseAuditQuery({}));
    const failures = result.page.items.filter((row) => row.log.outcome === 'FAILURE');
    expect(failures.length).toBeGreaterThan(0);
  });

  it('로그에 값이 아니라 필드 이름만 남는다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    await withAudit(
      admin,
      {
        action: 'admin.updateUser',
        targetType: 'user',
        targetId: requester.id,
        changedFields: ['departmentId', 'title', 'isActive'],
        summary: '사용자 정보를 수정했습니다.',
      },
      () =>
        updateUser(admin, {
          userId: requester.id,
          departmentId: DEMO_DEPARTMENT_IDS.informationCenter,
          title: '비밀 직위명',
          isActive: true,
        }),
    );

    const result = await listAuditLogs(parseAuditQuery({}));
    const entry = result.page.items.find((row) => row.log.action === 'admin.updateUser');

    expect(entry?.log.changedFields).toContain('title');
    // 바뀐 값 자체는 어디에도 없어야 한다.
    expect(JSON.stringify(entry?.log)).not.toContain('비밀 직위명');
  });

  it('행위자로 필터링할 수 있다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    await withAudit(
      admin,
      { action: 'admin.test', targetType: 'user', targetId: requester.id },
      async () => null,
    );

    const filtered = await listAuditLogs(parseAuditQuery({ actor: admin.id }));
    expect(filtered.page.items.every((row) => row.log.actorUserId === admin.id)).toBe(true);
  });

  it('잘못된 날짜 형식은 무시한다', () => {
    const query = parseAuditQuery({ from: '어제', to: '2026/07/31' });
    expect(query.from).toBe('');
    expect(query.to).toBe('');
  });
});
