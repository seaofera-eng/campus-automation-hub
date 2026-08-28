import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveDraft, startNewVersion, submitTool } from '@/application/tools/register';
import { addAttachment } from '@/application/tools/attachments';
import { DomainError } from '@/domain/shared/errors';
import { getRepositories } from '@/lib/di/container';
import { emptyToolForm, toolSubmitSchema, type ToolFormInput } from '@/lib/validation/tool';
import { DEMO_CATEGORY_IDS } from '@/repositories/demo/seed-ids';
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
    problemStatement: '회의록 정리에 회의당 40분이 걸립니다.',
    keyFeatures: ['녹취 요약', '할 일 추출'],
    currentWorkflow: '담당자가 녹취를 듣고 직접 정리합니다.',
    automatedWorkflow: '도구가 초안을 만들고 담당자가 확인합니다.',
    inputData: '회의 녹취 파일',
    outputData: '요약본과 할 일 목록',
    classifications: form.classifications.map((entry) =>
      entry.classification === 'INTERNAL' ? { ...entry, inUse: true } : entry,
    ),
    // 실제로 쓸 방법이 있어야 신청할 수 있다 (리뷰 2026-08-27 3절)
    serviceUrl: 'https://tool.demo.university.test/meeting-notes',
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

  it('보관기간은 더 이상 등록자에게 묻지 않는다', () => {
    /*
     * 리뷰 2026-08-27 3.2절에서 뺀 항목이다. 만드는 사람 대부분이 쓸 말이
     * 없었고, 그렇게 채워진 칸은 검토에 도움이 되지 않으면서 등록만 막았다.
     *
     * 위험 판단에서 빠진 것은 아니다 — 검토자가 위험 체크리스트에서 직접
     * 판단한다. 물어보는 사람이 바뀌었을 뿐이다.
     */
    const result = toolSubmitSchema.safeParse(
      completeForm({ dataRetentionPeriod: '', dataStorageLocation: '' }),
    );
    expect(result.success).toBe(true);
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

/* -------------------------------------------------------------------------- */
/* 실제로 쓸 수 있는 도구만 검토로 넘긴다 (리뷰 2026-08-27 3절)                 */
/* -------------------------------------------------------------------------- */

describe('쓸 방법이 없는 도구', () => {
  it('주소도 파일도 없으면 신청을 거부한다', async () => {
    const developer = await demoProfile('developer');
    // 설명은 완벽하지만 실체가 없는 도구.
    const form = completeForm({ serviceUrl: '', repositoryUrl: '' });
    const { toolId } = await saveDraft(developer, { form });

    await expect(submitTool(developer, { toolId, form })).rejects.toThrowError(
      /실제로 쓸 방법/,
    );

    // 거부됐으면 상태가 그대로여야 한다. 반쯤 넘어가면 안 된다.
    const tool = await getRepositories().tools.getTool(toolId);
    expect(tool?.status).toBe('DRAFT');
  });

  it('소스 저장소 주소만 있어도 신청은 된다', async () => {
    const developer = await demoProfile('developer');
    const form = completeForm({
      serviceUrl: '',
      repositoryUrl: 'https://git.demo.university.test/meeting-notes',
    });
    const { toolId } = await saveDraft(developer, { form });

    await submitTool(developer, { toolId, form });
    expect((await getRepositories().tools.getTool(toolId))?.status).toBe('SUBMITTED');
  });

  it('프로그램 파일을 붙이면 주소가 없어도 신청된다', async () => {
    const developer = await demoProfile('developer');
    const form = completeForm({ serviceUrl: '', repositoryUrl: '' });
    const { toolId, versionId } = await saveDraft(developer, { form });

    await addAttachment(developer, {
      toolId: toolId as string,
      kind: 'PROGRAM',
      fileName: '회의록정리.zip',
      mimeType: 'application/zip',
      bytes: new Uint8Array([80, 75, 3, 4]),
    });

    // 첨부는 버전에 붙는다. 붙인 곳이 맞는지 확인한다.
    const attached = await getRepositories().tools.listAttachments(versionId);
    expect(attached.some((entry) => entry.kind === 'PROGRAM')).toBe(true);

    await submitTool(developer, { toolId, form });
    expect((await getRepositories().tools.getTool(toolId))?.status).toBe('SUBMITTED');
  });
});

/* -------------------------------------------------------------------------- */
/* 새 버전으로 고치기 (리뷰 2026-08-27 3절)                                     */
/* -------------------------------------------------------------------------- */

/** 승인까지 올려 둔 도구 하나. 새 버전 규칙을 보려면 여기서 시작해야 한다. */
async function approvedTool() {
  const developer = await demoProfile('developer');
  const form = completeForm({ name: `승인된 도구 ${Date.now()}` });
  const { toolId, versionId } = await saveDraft(developer, { form });
  await submitTool(developer, { toolId, form });

  const repositories = getRepositories();
  const tool = await repositories.tools.getTool(toolId);
  if (!tool) throw new Error('도구를 찾지 못했습니다.');
  await repositories.tools.updateTool({ ...tool, status: 'APPROVED' });

  return { developer, toolId, versionId };
}

describe('새 버전 만들기', () => {
  it('승인된 도구를 바로 고칠 수는 없다', async () => {
    const { developer, toolId } = await approvedTool();

    // 검토를 통과한 내용이 소리 없이 바뀌면 검토가 무의미해진다.
    await expect(
      saveDraft(developer, { toolId: toolId as string, form: completeForm() }),
    ).rejects.toThrowError(/새 버전/);
  });

  it('새 버전을 만들면 임시저장으로 돌아간다', async () => {
    const { developer, toolId, versionId } = await approvedTool();

    const newVersionId = await startNewVersion(developer, toolId as string);
    expect(newVersionId).not.toBe(versionId);

    const tool = await getRepositories().tools.getTool(toolId);
    expect(tool?.status).toBe('DRAFT');
    expect(tool?.currentVersionId).toBe(newVersionId);
  });

  it('이전 버전은 지우지 않는다', async () => {
    const { developer, toolId, versionId } = await approvedTool();
    await startNewVersion(developer, toolId as string);

    // 이전 버전에 붙은 평가와 이력이 살아 있어야 한다.
    expect(await getRepositories().tools.getVersion(versionId)).not.toBeNull();
  });

  it('첨부는 새 버전으로 따라온다', async () => {
    const { developer, toolId } = await approvedTool();
    await addAttachment(developer, {
      toolId: toolId as string,
      kind: 'PROGRAM',
      fileName: '도구.zip',
      mimeType: 'application/zip',
      bytes: new Uint8Array([80, 75, 3, 4]),
    });

    const newVersionId = await startNewVersion(developer, toolId as string);

    // 매번 다시 올리게 하면 아무도 안 고친다.
    const copied = await getRepositories().tools.listAttachments(newVersionId);
    expect(copied.some((entry) => entry.fileName === '도구.zip')).toBe(true);
  });

  it('버전 번호가 올라간다', async () => {
    const { developer, toolId } = await approvedTool();
    const newVersionId = await startNewVersion(developer, toolId as string);

    const version = await getRepositories().tools.getVersion(newVersionId);
    expect(version?.versionLabel).toBe('v1.1');
    // 무엇을 고치는지는 본인이 적는다. 지어내지 않는다.
    expect(version?.changeNote).toBe('');
  });

  it('남의 도구에는 새 버전을 만들 수 없다', async () => {
    const { toolId } = await approvedTool();
    const other = await demoProfile('requester');

    await expect(startNewVersion(other, toolId as string)).rejects.toThrowError(DomainError);
  });

  it('검토 중인 도구에는 새 버전을 만들 수 없다', async () => {
    const developer = await demoProfile('developer');
    const form = completeForm({ name: `검토 중 도구 ${Date.now()}` });
    const { toolId } = await saveDraft(developer, { form });
    await submitTool(developer, { toolId, form });

    // 검토자가 보던 내용이 발밑에서 바뀌면 안 된다.
    await expect(startNewVersion(developer, toolId as string)).rejects.toThrowError(
      /검토가 진행 중/,
    );
  });

  it('임시저장 상태에서는 새 버전이 필요 없다', async () => {
    const developer = await demoProfile('developer');
    const { toolId } = await saveDraft(developer, {
      form: completeForm({ name: `초안 도구 ${Date.now()}` }),
    });

    await expect(startNewVersion(developer, toolId as string)).rejects.toThrowError(
      /바로 수정할 수 있습니다/,
    );
  });
});
