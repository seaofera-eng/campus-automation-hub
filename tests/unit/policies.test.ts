import { describe, expect, it } from 'vitest';
import { PERMISSION_ACTIONS } from '@/domain/authz/actions';
import type { PermissionAction } from '@/domain/authz/actions';
import { assertCan, can } from '@/domain/authz/policies';
import type { Actor, ResourceContext } from '@/domain/authz/policies';
import { USER_ROLES } from '@/domain/authz/roles';
import type { UserRole } from '@/domain/authz/roles';
import { DomainError } from '@/domain/shared/errors';
import { asId } from '@/domain/shared/ids';
import type { CampusId, DepartmentId, UserId } from '@/domain/shared/ids';

/**
 * 요구사항 5번: 권한 검사는 화면에서만 하지 않는다.
 * 이 파일은 서버 측 권한 규칙의 회귀 테스트다.
 */

const CAMPUS = asId<CampusId>('11111111-1111-4111-8111-111111111111');
const DEPT_A = asId<DepartmentId>('22222222-2222-4222-8222-222222222222');
const DEPT_B = asId<DepartmentId>('33333333-3333-4333-8333-333333333333');
const ME = asId<UserId>('44444444-4444-4444-8444-444444444444');
const SOMEONE_ELSE = asId<UserId>('55555555-5555-4555-8555-555555555555');

function actor(role: UserRole, departmentId: DepartmentId | null = DEPT_A): Actor {
  return { id: ME, role, departmentId, campusId: CAMPUS };
}

/** 내가 담당자인 리소스 */
const mine: ResourceContext = { ownerId: ME, developerIds: [ME], departmentId: DEPT_A };
/** 남의 리소스 */
const theirs: ResourceContext = {
  ownerId: SOMEONE_ELSE,
  developerIds: [SOMEONE_ELSE],
  departmentId: DEPT_B,
};

describe('관리자', () => {
  it.each(PERMISSION_ACTIONS)('%s 를 수행할 수 있다', (action: PermissionAction) => {
    expect(can(actor('ADMIN'), action, theirs)).toBe(true);
  });
});

describe('도구 권한', () => {
  it('개발자만 도구를 등록할 수 있다', () => {
    expect(can(actor('DEVELOPER'), 'tool:create')).toBe(true);
    expect(can(actor('REQUESTER'), 'tool:create')).toBe(false);
    expect(can(actor('REVIEWER'), 'tool:create')).toBe(false);
  });

  it('개발자는 자기 도구만 수정·제출할 수 있다', () => {
    expect(can(actor('DEVELOPER'), 'tool:update', mine)).toBe(true);
    expect(can(actor('DEVELOPER'), 'tool:update', theirs)).toBe(false);
    expect(can(actor('DEVELOPER'), 'tool:submit', mine)).toBe(true);
    expect(can(actor('DEVELOPER'), 'tool:submit', theirs)).toBe(false);
  });

  it('사용 중지·폐기는 관리자 전용이다', () => {
    for (const role of ['REQUESTER', 'DEVELOPER', 'REVIEWER'] as const) {
      expect(can(actor(role), 'tool:suspend', mine)).toBe(false);
      expect(can(actor(role), 'tool:retire', mine)).toBe(false);
    }
    expect(can(actor('ADMIN'), 'tool:suspend', theirs)).toBe(true);
  });
});

describe('도구 읽기 범위', () => {
  it('DRAFT 는 담당자·검토자·관리자만 볼 수 있다', () => {
    const draft: ResourceContext = { ...theirs, toolStatus: 'DRAFT', visibility: 'CAMPUS' };
    expect(can(actor('REQUESTER'), 'tool:read', draft)).toBe(false);
    expect(can(actor('DEVELOPER'), 'tool:read', draft)).toBe(false);
    expect(can(actor('REVIEWER'), 'tool:read', draft)).toBe(true);
    expect(can(actor('ADMIN'), 'tool:read', draft)).toBe(true);
  });

  it('담당 개발자는 자기 DRAFT 를 볼 수 있다', () => {
    expect(
      can(actor('DEVELOPER'), 'tool:read', { ...mine, toolStatus: 'DRAFT', visibility: 'PRIVATE' }),
    ).toBe(true);
  });

  it('DEPARTMENT 공개는 같은 부서만 볼 수 있다', () => {
    const scoped: ResourceContext = {
      ownerId: SOMEONE_ELSE,
      departmentId: DEPT_A,
      toolStatus: 'APPROVED',
      visibility: 'DEPARTMENT',
    };
    expect(can(actor('REQUESTER', DEPT_A), 'tool:read', scoped)).toBe(true);
    expect(can(actor('REQUESTER', DEPT_B), 'tool:read', scoped)).toBe(false);
    expect(can(actor('REQUESTER', null), 'tool:read', scoped)).toBe(false);
  });
});

describe('수요 · 매칭 권한', () => {
  it('누구나 수요를 등록하고 조회할 수 있다', () => {
    for (const role of USER_ROLES) {
      expect(can(actor(role), 'demand:create')).toBe(true);
      expect(can(actor(role), 'demand:read')).toBe(true);
    }
  });

  it('수요-도구 연결은 검토자·관리자만 한다 (요구사항 8번)', () => {
    expect(can(actor('REVIEWER'), 'demand:match')).toBe(true);
    expect(can(actor('ADMIN'), 'demand:match')).toBe(true);
    expect(can(actor('DEVELOPER'), 'demand:match')).toBe(false);
    expect(can(actor('REQUESTER'), 'demand:match')).toBe(false);
  });

  it('개발 참여 신청은 개발자만 한다', () => {
    expect(can(actor('DEVELOPER'), 'demand:participate')).toBe(true);
    expect(can(actor('REQUESTER'), 'demand:participate')).toBe(false);
  });

  it('수요 수정은 등록 본인만 한다', () => {
    expect(can(actor('REQUESTER'), 'demand:update', mine)).toBe(true);
    expect(can(actor('REQUESTER'), 'demand:update', theirs)).toBe(false);
  });
});

describe('평가 권한', () => {
  it('누구나 평가를 등록할 수 있다', () => {
    for (const role of USER_ROLES) {
      expect(can(actor(role), 'evaluation:create')).toBe(true);
    }
  });

  it('평가 수정은 작성 본인만 한다', () => {
    expect(can(actor('REQUESTER'), 'evaluation:update', mine)).toBe(true);
    expect(can(actor('REQUESTER'), 'evaluation:update', theirs)).toBe(false);
  });
});

describe('검토 · 관리자 화면 권한', () => {
  it('검토 작업은 검토자·관리자만 한다', () => {
    for (const action of ['review:list', 'review:comment', 'review:checklist'] as const) {
      expect(can(actor('REVIEWER'), action)).toBe(true);
      expect(can(actor('ADMIN'), action)).toBe(true);
      expect(can(actor('DEVELOPER'), action)).toBe(false);
      expect(can(actor('REQUESTER'), action)).toBe(false);
    }
  });

  it('검토자는 자기 자신에게만 배정할 수 있다', () => {
    expect(can(actor('REVIEWER'), 'review:assign', { assigneeId: ME })).toBe(true);
    expect(can(actor('REVIEWER'), 'review:assign', { assigneeId: SOMEONE_ELSE })).toBe(false);
  });

  it('관리자 화면은 관리자 전용이다', () => {
    const adminActions = PERMISSION_ACTIONS.filter((action) => action.startsWith('admin:'));
    expect(adminActions.length).toBeGreaterThan(0);
    for (const action of adminActions) {
      expect(can(actor('REVIEWER'), action)).toBe(false);
      expect(can(actor('ADMIN'), action)).toBe(true);
    }
  });
});

describe('assertCan', () => {
  it('권한이 없으면 FORBIDDEN 을 던진다', () => {
    try {
      assertCan(actor('REQUESTER'), 'tool:create');
      expect.unreachable('예외가 발생해야 한다');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('FORBIDDEN');
    }
  });

  it('권한이 있으면 아무 일도 하지 않는다', () => {
    expect(() => assertCan(actor('DEVELOPER'), 'tool:create')).not.toThrow();
  });
});
