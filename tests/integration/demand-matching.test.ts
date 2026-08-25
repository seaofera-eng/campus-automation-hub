import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { joinDemand, linkToolToDemand, unlinkToolFromDemand } from '@/application/demands/match';
import { saveDemandDraft, transitionDemand } from '@/application/demands/register';
import type { Profile } from '@/domain/identity/types';
import type { DemandId } from '@/domain/shared/ids';
import { getRepositories } from '@/lib/di/container';
import { demandPublishSchema, emptyDemandForm } from '@/lib/validation/demand';
import type { DemandFormInput } from '@/lib/validation/demand';
import { DEMO_DEPARTMENT_IDS, DEMO_TOOL_IDS } from '@/repositories/demo/seed-ids';
import { demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 수요 등록 · 수동 매칭 · 개발 참여 (요구사항 8번, 19번 7번 시나리오).
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

function completeForm(title: string): DemandFormInput {
  return {
    ...emptyDemandForm(),
    title,
    departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
    currentWorkDescription: '담당자가 엑셀을 하나씩 열어 확인합니다.',
    mostPainfulStep: '학과별 파일을 일일이 대조하는 단계',
    desiredOutcome: '충족 여부가 표시된 통합 표',
    requiredFeatures: ['학과별 파일 자동 취합'],
  };
}

/** 공개까지 마친 수요를 만든다. */
async function openDemand(requester: Profile, title = '공개된 수요'): Promise<DemandId> {
  const { demandId } = await saveDemandDraft(requester, { form: completeForm(title) });
  await transitionDemand(requester, { demandId, toStatus: 'OPEN', reason: '공개합니다.' });
  return demandId;
}

describe('수요 등록', () => {
  it('제목만 있어도 임시저장된다', async () => {
    const requester = await demoProfile('requester');
    const { demandId, created } = await saveDemandDraft(requester, {
      form: { ...emptyDemandForm(), title: '작성 중인 수요' },
    });

    expect(created).toBe(true);
    const demand = await getRepositories().demands.getDemand(demandId);
    expect(demand?.status).toBe('DRAFT');
    expect(demand?.requesterUserId).toBe(requester.id);
  });

  it('누구나 수요를 등록할 수 있다', async () => {
    for (const role of ['requester', 'developer', 'reviewer', 'admin'] as const) {
      const actor = await demoProfile(role);
      const { demandId } = await saveDemandDraft(actor, {
        form: { ...emptyDemandForm(), title: `${role} 가 등록한 수요` },
      });
      expect(demandId).toBeTruthy();
    }
  });

  it('등록 본인만 수정할 수 있다', async () => {
    const requester = await demoProfile('requester');
    const other = await demoProfile('requester2');
    const { demandId } = await saveDemandDraft(requester, {
      form: { ...emptyDemandForm(), title: '내 수요' },
    });

    await expect(
      saveDemandDraft(other, { demandId, form: { ...emptyDemandForm(), title: '가로챈 수요' } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('개발이 시작된 수요는 내용을 바꿀 수 없다', async () => {
    const requester = await demoProfile('requester');
    const reviewer = await demoProfile('reviewer');
    const demandId = await openDemand(requester);

    await transitionDemand(reviewer, {
      demandId,
      toStatus: 'IN_DEVELOPMENT',
      reason: '개발을 시작합니다.',
    });

    await expect(
      saveDemandDraft(requester, { demandId, form: completeForm('내용 변경') }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('공개 검증 규칙', () => {
  it('완성된 폼은 통과한다', () => {
    expect(demandPublishSchema.safeParse(completeForm('제목')).success).toBe(true);
  });

  it('현재 업무 처리 방식이 없으면 거부한다', () => {
    const result = demandPublishSchema.safeParse({
      ...completeForm('제목'),
      currentWorkDescription: '',
    });
    expect(result.success).toBe(false);
  });

  it('꼭 필요한 기능이 없으면 거부한다', () => {
    const result = demandPublishSchema.safeParse({
      ...completeForm('제목'),
      requiredFeatures: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('상태 전환', () => {
  it('등록 본인은 공개하고 종료할 수 있다', async () => {
    const requester = await demoProfile('requester');
    const demandId = await openDemand(requester);

    expect((await getRepositories().demands.getDemand(demandId))?.status).toBe('OPEN');

    await transitionDemand(requester, {
      demandId,
      toStatus: 'CLOSED',
      reason: '더 이상 필요하지 않습니다.',
    });
    expect((await getRepositories().demands.getDemand(demandId))?.status).toBe('CLOSED');
  });

  it('등록 본인이라도 개발 단계 전환은 검토자·관리자 몫이다', async () => {
    const requester = await demoProfile('requester');
    const demandId = await openDemand(requester);

    await expect(
      transitionDemand(requester, {
        demandId,
        toStatus: 'IN_DEVELOPMENT',
        reason: '개발을 시작합니다.',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('남의 수요는 상태를 바꿀 수 없다', async () => {
    const requester = await demoProfile('requester');
    const other = await demoProfile('requester2');
    const { demandId } = await saveDemandDraft(requester, {
      form: { ...emptyDemandForm(), title: '남의 수요' },
    });

    await expect(
      transitionDemand(other, { demandId, toStatus: 'OPEN', reason: '공개' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('수요-도구 수동 매칭 (요구사항 8번)', () => {
  it('검토자는 도구를 연결하고 사유가 저장된다', async () => {
    const requester = await demoProfile('requester');
    const reviewer = await demoProfile('reviewer');
    const demandId = await openDemand(requester);

    const match = await linkToolToDemand(reviewer, {
      demandId,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      matchType: 'NEEDS_CONFIGURATION',
      rationale: '취합 기능은 그대로 쓰고 학과별 열 매핑만 바꾸면 됩니다.',
    });

    expect(match.matchType).toBe('NEEDS_CONFIGURATION');
    expect(match.rationale).toContain('열 매핑');
    expect(match.matchedBy).toBe(reviewer.id);

    const matches = await getRepositories().demands.listMatches(demandId);
    expect(matches).toHaveLength(1);
  });

  it('개발자와 수요자는 연결할 수 없다', async () => {
    const requester = await demoProfile('requester');
    const developer = await demoProfile('developer');
    const demandId = await openDemand(requester);

    const input = {
      demandId,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      matchType: 'READY_TO_USE' as const,
      rationale: '바로 쓸 수 있어 보입니다.',
    };

    await expect(linkToolToDemand(developer, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(linkToolToDemand(requester, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('같은 도구를 두 번 연결할 수 없다', async () => {
    const requester = await demoProfile('requester');
    const reviewer = await demoProfile('reviewer');
    const demandId = await openDemand(requester);

    const input = {
      demandId,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      matchType: 'READY_TO_USE' as const,
      rationale: '바로 사용할 수 있습니다.',
    };

    await linkToolToDemand(reviewer, input);
    await expect(linkToolToDemand(reviewer, input)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('연결을 해제할 수 있고, 다른 수요의 연결 ID 로는 지워지지 않는다', async () => {
    const requester = await demoProfile('requester');
    const reviewer = await demoProfile('reviewer');
    const first = await openDemand(requester, '첫 번째 수요');
    const second = await openDemand(requester, '두 번째 수요');

    const match = await linkToolToDemand(reviewer, {
      demandId: first,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      matchType: 'READY_TO_USE',
      rationale: '바로 사용할 수 있습니다.',
    });

    // 다른 수요를 대상으로는 지워지지 않는다.
    await expect(unlinkToolFromDemand(reviewer, second, match.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    await unlinkToolFromDemand(reviewer, first, match.id);
    expect(await getRepositories().demands.listMatches(first)).toHaveLength(0);
  });

  it('연결하면 수요 등록자에게 알림이 간다', async () => {
    const requester = await demoProfile('requester');
    const reviewer = await demoProfile('reviewer');
    const demandId = await openDemand(requester);

    await linkToolToDemand(reviewer, {
      demandId,
      toolId: DEMO_TOOL_IDS.excelAggregation,
      matchType: 'READY_TO_USE',
      rationale: '바로 사용할 수 있습니다.',
    });

    const notifications = await getRepositories().observability.listNotifications(
      requester.id,
      true,
    );
    expect(notifications.some((item) => item.kind === 'DEMAND_MATCHED')).toBe(true);
  });
});

describe('개발 참여 신청', () => {
  it('개발자는 참여를 신청할 수 있다', async () => {
    const requester = await demoProfile('requester');
    const developer = await demoProfile('developer');
    const demandId = await openDemand(requester);

    const participant = await joinDemand(developer, {
      demandId,
      participantRole: 'DEVELOPER',
      message: '비슷한 취합 도구를 만들어 본 적이 있습니다.',
    });

    expect(participant.userId).toBe(developer.id);

    const notifications = await getRepositories().observability.listNotifications(
      requester.id,
      true,
    );
    expect(notifications.some((item) => item.kind === 'DEMAND_PARTICIPANT_JOINED')).toBe(true);
    // 참여 메시지 원문은 알림에 담지 않는다.
    expect(notifications.every((item) => !item.body.includes('취합 도구를 만들어'))).toBe(true);
  });

  it('수요자는 참여를 신청할 수 없다', async () => {
    const requester = await demoProfile('requester');
    const other = await demoProfile('requester2');
    const demandId = await openDemand(requester);

    await expect(
      joinDemand(other, { demandId, participantRole: 'DEVELOPER', message: '돕고 싶습니다.' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('공개되지 않은 수요에는 신청할 수 없다', async () => {
    const requester = await demoProfile('requester');
    const developer = await demoProfile('developer');
    const { demandId } = await saveDemandDraft(requester, {
      form: { ...emptyDemandForm(), title: '아직 임시저장' },
    });

    await expect(
      joinDemand(developer, { demandId, participantRole: 'DEVELOPER', message: '참여하겠습니다.' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('종료된 수요에는 신청할 수 없다', async () => {
    const requester = await demoProfile('requester');
    const developer = await demoProfile('developer');
    const demandId = await openDemand(requester);
    await transitionDemand(requester, { demandId, toStatus: 'CLOSED', reason: '종료합니다.' });

    await expect(
      joinDemand(developer, { demandId, participantRole: 'DEVELOPER', message: '참여하겠습니다.' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('같은 사람이 두 번 신청할 수 없다', async () => {
    const requester = await demoProfile('requester');
    const developer = await demoProfile('developer');
    const demandId = await openDemand(requester);

    const input = {
      demandId,
      participantRole: 'DEVELOPER' as const,
      message: '참여하고 싶습니다.',
    };
    await joinDemand(developer, input);
    await expect(joinDemand(developer, input)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
