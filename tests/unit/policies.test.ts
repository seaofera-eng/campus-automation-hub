import { describe, expect, it } from 'vitest';
import { ADMIN_PERMISSIONS } from '@/domain/authz/accounts';
import type { AdminPermission } from '@/domain/authz/accounts';
import { PERMISSION_ACTIONS } from '@/domain/authz/actions';
import type { PermissionAction } from '@/domain/authz/actions';
import { assertCan, can } from '@/domain/authz/policies';
import type { Actor, ResourceContext } from '@/domain/authz/policies';
import { DomainError } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { CampusId, UserId } from '@/domain/shared/ids';

/**
 * 요구사항 5번: 권한 검사는 화면에서만 하지 않는다.
 * 이 파일은 서버 측 권한 규칙의 회귀 테스트다.
 *
 * 새 모델의 판단 기준은 둘뿐이다.
 *   1) 내가 만든 것인가 (소유권)
 *   2) 관리자로서 그 권한을 받았는가
 * 이용자끼리는 구분하지 않는다.
 */

const CAMPUS = asId<CampusId>('11111111-1111-4111-8111-111111111111');
const ME = asId<UserId>('44444444-4444-4444-8444-444444444444');
const SOMEONE_ELSE = asId<UserId>('55555555-5555-4555-8555-555555555555');

/** 관리 권한이 없는 보통 이용자 */
function user(): Actor {
  return { id: ME, accountType: 'USER', adminPermissions: [], campusId: CAMPUS };
}

/** 특정 관리 권한만 가진 관리자 */
function admin(...permissions: AdminPermission[]): Actor {
  return { id: ME, accountType: 'ADMIN', adminPermissions: permissions, campusId: CAMPUS };
}

/** 모든 관리 권한을 가진 관리자 */
function superAdmin(): Actor {
  return admin(...ADMIN_PERMISSIONS);
}

/** 내가 만든 리소스 */
const mine: ResourceContext = { ownerId: ME, developerIds: [ME] };
/** 남의 리소스 */
const theirs: ResourceContext = { ownerId: SOMEONE_ELSE, developerIds: [SOMEONE_ELSE] };

describe('이용자 — 누구나 할 수 있는 일', () => {
  it.each([
    'tool:create',
    'demand:create',
    'demand:read',
    'demand:participate',
    'evaluation:create',
    'evaluation:read',
    'improvement:create',
    'improvement:read',
  ] as const)('%s 는 관리 권한 없이도 할 수 있다', (action) => {
    expect(can(user(), action, theirs)).toBe(true);
  });

  /**
   * 이 플랫폼의 핵심 전제다. 수요자와 개발자를 나누지 않는다.
   * 수요를 올린 사람이 다른 수요의 도구를 만들 수 있어야 한다.
   */
  it('한 사람이 수요 등록과 도구 등록을 모두 할 수 있다', () => {
    expect(can(user(), 'demand:create')).toBe(true);
    expect(can(user(), 'tool:create')).toBe(true);
  });
});

describe('이용자 — 소유권으로 갈리는 일', () => {
  it.each(['tool:update', 'tool:attach', 'tool:submit', 'tool:createVersion'] as const)(
    '%s 는 내가 만든 도구에만 할 수 있다',
    (action) => {
      expect(can(user(), action, mine)).toBe(true);
      expect(can(user(), action, theirs)).toBe(false);
    },
  );

  it('수요는 등록한 본인만 고칠 수 있다', () => {
    expect(can(user(), 'demand:update', mine)).toBe(true);
    expect(can(user(), 'demand:update', theirs)).toBe(false);
  });

  it('평가는 자기가 쓴 것만 고칠 수 있다', () => {
    expect(can(user(), 'evaluation:update', mine)).toBe(true);
    expect(can(user(), 'evaluation:update', theirs)).toBe(false);
  });
});

describe('이용자 — 할 수 없는 일', () => {
  it.each([
    'review:list',
    'review:assign',
    'review:comment',
    'review:checklist',
    'demand:match',
    'tool:suspend',
    'tool:retire',
    'admin:dashboard',
    'admin:users',
    'admin:categories',
    'admin:auditLogs',
    'admin:notices',
  ] as const)('%s 는 관리 권한이 있어야 한다', (action) => {
    expect(can(user(), action, mine)).toBe(false);
  });
});

describe('관리 권한은 받은 것만 쓴다', () => {
  it('검토 권한만 있으면 검토는 되지만 계정 관리는 안 된다', () => {
    const reviewer = admin('REVIEW');
    expect(can(reviewer, 'review:list')).toBe(true);
    expect(can(reviewer, 'review:checklist')).toBe(true);
    expect(can(reviewer, 'demand:match')).toBe(true);
    expect(can(reviewer, 'admin:users')).toBe(false);
    expect(can(reviewer, 'admin:auditLogs')).toBe(false);
    expect(can(reviewer, 'tool:suspend')).toBe(false);
  });

  it('계정 관리 권한만 있으면 검토는 안 된다', () => {
    const manager = admin('MANAGE_USERS');
    expect(can(manager, 'admin:users')).toBe(true);
    expect(can(manager, 'review:list')).toBe(false);
    expect(can(manager, 'demand:match')).toBe(false);
  });

  it('감사 로그 열람은 VIEW_AUDIT 이 있어야 한다', () => {
    expect(can(admin('VIEW_AUDIT'), 'admin:auditLogs')).toBe(true);
    expect(can(admin('MANAGE_USERS'), 'admin:auditLogs')).toBe(false);
  });

  it('사용 중지·폐기는 도구 운영 권한이 있어야 한다', () => {
    expect(can(admin('MANAGE_TOOLS'), 'tool:suspend', theirs)).toBe(true);
    expect(can(admin('REVIEW'), 'tool:retire', theirs)).toBe(false);
  });

  /**
   * 권한을 하나도 받지 못한 관리자 계정은 이용자와 같아야 한다.
   * 계정 종류만으로 문이 열리면 세분화한 의미가 없다.
   */
  it('권한 없는 관리자 계정은 이용자와 같다', () => {
    const empty: Actor = { id: ME, accountType: 'ADMIN', adminPermissions: [], campusId: CAMPUS };
    expect(can(empty, 'admin:dashboard')).toBe(false);
    expect(can(empty, 'review:list')).toBe(false);
    expect(can(empty, 'tool:update', theirs)).toBe(false);
    expect(can(empty, 'tool:create')).toBe(true);
  });
});

describe('검토 배정', () => {
  it('검토자는 자기 자신에게 배정할 수 있다', () => {
    expect(can(admin('REVIEW'), 'review:assign', { assigneeId: ME })).toBe(true);
  });

  it('남에게 배정하려면 계정 관리 권한이 함께 있어야 한다', () => {
    expect(can(admin('REVIEW'), 'review:assign', { assigneeId: SOMEONE_ELSE })).toBe(false);
    expect(can(admin('REVIEW', 'MANAGE_USERS'), 'review:assign', { assigneeId: SOMEONE_ELSE })).toBe(
      true,
    );
  });
});

describe('도구 읽기', () => {
  it('임시저장은 만든 사람만 본다', () => {
    expect(can(user(), 'tool:read', { ...mine, toolStatus: 'DRAFT' })).toBe(true);
    expect(can(user(), 'tool:read', { ...theirs, toolStatus: 'DRAFT' })).toBe(false);
  });

  it('검토 권한이 있으면 남의 임시저장도 볼 수 있다', () => {
    expect(can(admin('REVIEW'), 'tool:read', { ...theirs, toolStatus: 'DRAFT' })).toBe(true);
  });

  /**
   * 공개 범위와 부서 칸막이를 없앴다. 서로 보라고 올리는 것이고,
   * 가려 두면 "누가 이미 만들었는지"를 못 찾아 같은 걸 또 만들게 된다.
   */
  it('제출된 뒤에는 누구나 볼 수 있다', () => {
    for (const status of ['SUBMITTED', 'HUMAN_REVIEW', 'PILOT', 'APPROVED'] as const) {
      expect(can(user(), 'tool:read', { ...theirs, toolStatus: status })).toBe(true);
    }
  });
});

/**
 * 관리 권한은 **운영** 권한이지 **저작** 권한이 아니다.
 *
 * 예전 모델에서는 관리자가 모든 동작을 통과했다. 그러면 관리자가 남의 도구 설명이나
 * 남이 쓴 평가를 고칠 수 있다. 평가는 사람에 대한 판단이 섞이는 글이라 특히 그렇다.
 * 그래서 소유권으로 갈리는 동작은 관리 권한으로 넘지 못하게 둔다.
 */
const OWNERSHIP_ACTIONS: readonly PermissionAction[] = [
  'tool:update',
  'tool:submit',
  'tool:createVersion',
  'tool:attach',
  'demand:update',
  'evaluation:update',
];

describe('모든 권한을 가진 관리자', () => {
  it.each(PERMISSION_ACTIONS.filter((action) => !OWNERSHIP_ACTIONS.includes(action)))(
    '%s 를 수행할 수 있다',
    (action: PermissionAction) => {
      expect(can(superAdmin(), action, theirs)).toBe(true);
    },
  );

  it.each(OWNERSHIP_ACTIONS)('%s 는 남의 것에는 할 수 없다', (action) => {
    expect(can(superAdmin(), action, theirs)).toBe(false);
    expect(can(superAdmin(), action, mine)).toBe(true);
  });
});

describe('assertCan', () => {
  it('권한이 없으면 FORBIDDEN 을 던진다', () => {
    expect(() => assertCan(user(), 'admin:users')).toThrowError(DomainError);
    try {
      assertCan(user(), 'admin:users');
    } catch (error) {
      expect((error as DomainError).code).toBe('FORBIDDEN');
      // 무엇을 해야 하는지 알려 준다.
      expect((error as DomainError).message).toMatch(/관리자에게/);
    }
  });

  it('권한이 있으면 조용히 통과한다', () => {
    expect(() => assertCan(admin('MANAGE_USERS'), 'admin:users')).not.toThrow();
  });
});

describe('정의되지 않은 동작이 없는지', () => {
  it('모든 동작에 규칙이 있다 (throw 하지 않는다)', () => {
    for (const action of PERMISSION_ACTIONS) {
      expect(() => can(user(), action, mine)).not.toThrow();
    }
  });
});
