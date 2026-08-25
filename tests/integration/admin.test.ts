import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminPermission } from '@/domain/authz/accounts';
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
  changeAccountPermissions,
  listUsers,
  updateUser,
  upsertCategory,
} = await import('@/application/admin/manage');
const { withAudit } = await import('@/application/shared/audit');
const { getRepositories } = await import('@/lib/di/container');
const { parseAuditQuery } = await import('@/lib/validation/admin');
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

describe('권한 변경', () => {
  const ALL: AdminPermission[] = [
    'REVIEW',
    'MANAGE_USERS',
    'MANAGE_CATEGORIES',
    'MANAGE_TOOLS',
    'MANAGE_NOTICES',
    'VIEW_AUDIT',
  ];

  it('계정 관리 권한이 있으면 다른 사람을 관리자로 올릴 수 있다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    const updated = await changeAccountPermissions(admin, {
      userId: requester.id,
      accountType: 'ADMIN',
      adminPermissions: ['REVIEW'],
    });
    expect(updated.accountType).toBe('ADMIN');
    expect(updated.adminPermissions).toEqual(['REVIEW']);
  });

  it('이용자로 내리면 관리 권한도 함께 비워진다', async () => {
    const admin = await signInAs('admin');
    const reviewer = await demoProfile('reviewer');

    // 권한을 넘겨도 이용자로 내리면 서버가 비운다.
    const updated = await changeAccountPermissions(admin, {
      userId: reviewer.id,
      accountType: 'USER',
      adminPermissions: ['REVIEW'],
    });
    expect(updated.accountType).toBe('USER');
    expect(updated.adminPermissions).toEqual([]);
  });

  it('자기 권한은 스스로 바꿀 수 없다', async () => {
    const admin = await signInAs('admin');

    await expect(
      changeAccountPermissions(admin, {
        userId: admin.id,
        accountType: 'USER',
        adminPermissions: [],
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('자기 권한을 못 바꾸므로 관리자가 0명이 되는 일은 없다', async () => {
    const admin = await signInAs('admin');
    const requester = await demoProfile('requester');

    // 다른 사람을 관리자로 올린 뒤, 그 사람이 원래 관리자를 내릴 수 있다.
    // 이때도 내리는 쪽이 관리자로 남으므로 관리자가 사라지지 않는다.
    await changeAccountPermissions(admin, {
      userId: requester.id,
      accountType: 'ADMIN',
      adminPermissions: ALL,
    });
    const newAdmin = await demoProfile('requester');
    expect(newAdmin.accountType).toBe('ADMIN');

    const demoted = await changeAccountPermissions(newAdmin, {
      userId: admin.id,
      accountType: 'USER',
      adminPermissions: [],
    });
    expect(demoted.accountType).toBe('USER');

    const remaining = await getRepositories().identity.listProfiles(admin.campusId);
    expect(remaining.filter((item) => item.accountType === 'ADMIN').length).toBeGreaterThan(0);
  });

  it('같은 권한으로는 바꿀 수 없다', async () => {
    const admin = await signInAs('admin');
    const developer = await demoProfile('developer');

    await expect(
      changeAccountPermissions(admin, {
        userId: developer.id,
        accountType: 'USER',
        adminPermissions: [],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  /**
   * 검토 권한만 받은 관리자는 계정을 건드리지 못한다.
   * 권한을 세분화한 이유가 바로 이것이다.
   */
  it('검토 권한만 있는 관리자는 남의 권한을 바꿀 수 없다', async () => {
    const reviewer = await signInAs('reviewer');
    const requester = await demoProfile('requester');

    await expect(
      changeAccountPermissions(reviewer, {
        userId: requester.id,
        accountType: 'ADMIN',
        adminPermissions: ALL,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('사용자 정보 수정', () => {
  it('자기 계정은 비활성화할 수 없다', async () => {
    const admin = await signInAs('admin');

    await expect(
      updateUser(admin, {
        userId: admin.id,
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
      title: requester.title,
      isActive: false,
    });
    expect(updated.isActive).toBe(false);
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
        action: 'admin.changeAccountPermissions',
        targetType: 'user',
        targetId: requester.id,
        changedFields: ['accountType', 'adminPermissions'],
        summary: '권한 변경 테스트',
      },
      () =>
        changeAccountPermissions(admin, {
          userId: requester.id,
          accountType: 'ADMIN',
          adminPermissions: ['REVIEW'],
        }),
    );

    const result = await listAuditLogs(parseAuditQuery({}));
    const entry = result.page.items.find((row) => row.log.action === 'admin.changeAccountPermissions');

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
          action: 'admin.changeAccountPermissions',
          targetType: 'user',
          targetId: admin.id,
          changedFields: ['accountType', 'adminPermissions'],
        },
        // 자기 권한 변경은 막히는 작업이다.
        () =>
          changeAccountPermissions(admin, {
            userId: admin.id,
            accountType: 'USER',
            adminPermissions: [],
          }),
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
