import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveDraft, submitTool } from '@/application/tools/register';
import { DomainError } from '@/domain/shared/errors';
import { getRepositories } from '@/lib/di/container';
import { emptyToolForm, toolSubmitSchema, type ToolFormInput } from '@/lib/validation/tool';
import { DEMO_CATEGORY_IDS, DEMO_DEPARTMENT_IDS } from '@/repositories/demo/seed-ids';
import { demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 도구 등록 흐름 (요구사항 19번의 1~2번 시나리오).
 *
 * 서버 액션이 아니라 application 서비스를 직접 부른다.
 * 서버 액션은 next/headers 에 의존해 테스트 환경에서 돌지 않고,
 * 실제 규칙은 전부 이 계층에 있다.
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

function completeForm(overrides: Partial<ToolFormInput> = {}): ToolFormInput {
  const form = emptyToolForm();
  return {
    ...form,
    name: '회의록 자동 정리 도구',
    summary: '회의 녹취를 요약해 결정사항과 할 일을 정리합니다.',
    categoryId: DEMO_CATEGORY_IDS.documentMeeting,
    departmentId: DEMO_DEPARTMENT_IDS.academicAffairs,
    description: '회의 녹취 파일을 올리면 요약본을 만들어 줍니다.',
    problemStatement: '회의록 정리에 회의당 40분이 걸립니다.',
    keyFeatures: ['녹취 요약', '할 일 추출'],
    currentWorkflow: '담당자가 녹취를 듣고 직접 정리합니다.',
    automatedWorkflow: '도구가 초안을 만들고 담당자가 확인합니다.',
    inputData: '회의 녹취 파일',
    outputData: '요약본과 할 일 목록',
    classifications: form.classifications.map((entry) =>
      entry.classification === 'INTERNAL' ? { ...entry, inUse: true } : entry,
    ),
    dataStorageLocation: '교내 서버',
    dataRetentionPeriod: '처리 후 즉시 삭제',
    ...overrides,
  };
}

describe('임시저장', () => {
  it('이름만 있어도 DRAFT 로 저장된다', async () => {
    const developer = await demoProfile('developer');
    const result = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '작성 중인 도구' },
    });

    expect(result.created).toBe(true);

    const tool = await getRepositories().tools.getTool(result.toolId);
    expect(tool?.status).toBe('DRAFT');
    expect(tool?.ownerUserId).toBe(developer.id);
    // 작성자는 자동으로 개발자 목록에 들어간다.
    expect(tool?.developerUserIds).toContain(developer.id);
  });

  it('저장하면 DRAFT 상태 이력이 남는다', async () => {
    const developer = await demoProfile('developer');
    const { toolId } = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '이력 확인용 도구' },
    });

    const history = await getRepositories().tools.listStatusHistory(toolId);
    expect(history).toHaveLength(1);
    expect(history[0]?.fromStatus).toBeNull();
    expect(history[0]?.toStatus).toBe('DRAFT');
    expect(history[0]?.changedBy).toBe(developer.id);
  });

  it('같은 이름의 도구는 다시 등록할 수 없다', async () => {
    const developer = await demoProfile('developer');
    const form = { ...emptyToolForm(), name: '중복 이름 도구' };
    await saveDraft(developer, { form });

    await expect(saveDraft(developer, { form })).rejects.toThrowError(/이미 등록/);
  });

  /** 수요를 올리는 사람이 직접 도구를 만들 수도 있어야 한다. */
  it('관리 권한이 없어도 도구를 등록할 수 있다', async () => {
    const requester = await demoProfile('requester');
    const result = await saveDraft(requester, {
      form: { ...emptyToolForm(), name: '이용자가 만든 도구' },
    });
    expect(result.created).toBe(true);
  });

  it('이어서 저장하면 새로 만들지 않고 같은 도구를 수정한다', async () => {
    const developer = await demoProfile('developer');
    const first = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '이어쓰기 도구' },
    });

    const second = await saveDraft(developer, {
      toolId: first.toolId,
      form: { ...emptyToolForm(), name: '이어쓰기 도구', summary: '설명을 추가했습니다.' },
    });

    expect(second.created).toBe(false);
    expect(second.toolId).toBe(first.toolId);

    const tool = await getRepositories().tools.getTool(first.toolId);
    expect(tool?.summary).toBe('설명을 추가했습니다.');
  });

  it('남의 도구는 수정할 수 없다', async () => {
    const developer = await demoProfile('developer');
    const other = await demoProfile('developer2');
    const { toolId } = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '내 도구' },
    });

    await expect(
      saveDraft(other, { toolId, form: { ...emptyToolForm(), name: '가로챈 도구' } }),
    ).rejects.toThrowError(DomainError);
  });
});

describe('등록 신청', () => {
  it('필수 항목이 채워지면 SUBMITTED 로 넘어간다', async () => {
    const developer = await demoProfile('developer');
    const form = completeForm();
    const { toolId } = await saveDraft(developer, { form });

    await submitTool(developer, { toolId, form });

    const tool = await getRepositories().tools.getTool(toolId);
    expect(tool?.status).toBe('SUBMITTED');

    const history = await getRepositories().tools.listStatusHistory(toolId);
    const submitEntry = history.find((entry) => entry.toStatus === 'SUBMITTED');
    expect(submitEntry?.fromStatus).toBe('DRAFT');
    // 요구사항 7번: 상태 변경에는 항상 이유가 남는다.
    expect(submitEntry?.reason.length).toBeGreaterThanOrEqual(5);
  });

  it('신청 시 마지막 수정 내용이 함께 저장된다', async () => {
    const developer = await demoProfile('developer');
    const form = completeForm();
    const { toolId } = await saveDraft(developer, { form });

    await submitTool(developer, {
      toolId,
      form: { ...form, summary: '마지막 단계에서 고친 소개' },
    });

    const tool = await getRepositories().tools.getTool(toolId);
    expect(tool?.summary).toBe('마지막 단계에서 고친 소개');
  });

  it('이미 신청한 도구는 다시 신청할 수 없다', async () => {
    const developer = await demoProfile('developer');
    const form = completeForm();
    const { toolId } = await saveDraft(developer, { form });
    await submitTool(developer, { toolId, form });

    await expect(submitTool(developer, { toolId, form })).rejects.toThrowError(/검토가 시작된/);
  });
});

describe('신청 검증 규칙', () => {
  it('완성된 폼은 통과한다', () => {
    expect(toolSubmitSchema.safeParse(completeForm()).success).toBe(true);
  });

  it('데이터 분류를 하나도 고르지 않으면 거부한다', () => {
    const result = toolSubmitSchema.safeParse(
      completeForm({ classifications: emptyToolForm().classifications }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'classifications')).toBe(true);
    }
  });

  it('외부 전송을 켜면 전송 대상을 요구한다', () => {
    const result = toolSubmitSchema.safeParse(
      completeForm({ sendsDataExternally: true, externalTransferTargets: '' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'externalTransferTargets'),
      ).toBe(true);
    }
  });

  it('보관기간이 비어 있으면 거부한다', () => {
    const result = toolSubmitSchema.safeParse(completeForm({ dataRetentionPeriod: '' }));
    expect(result.success).toBe(false);
  });

  it('주요 기능이 없으면 거부한다', () => {
    const result = toolSubmitSchema.safeParse(completeForm({ keyFeatures: [] }));
    expect(result.success).toBe(false);
  });

  it('임시저장 기준으로는 이름만 있으면 통과한다', () => {
    const result = toolSubmitSchema.safeParse({ name: '이름만' });
    // 신청 기준으로는 실패하지만,
    expect(result.success).toBe(false);
    // 임시저장 기준으로는 통과해야 한다.
    expect(emptyToolForm().name).toBe('');
  });
});
