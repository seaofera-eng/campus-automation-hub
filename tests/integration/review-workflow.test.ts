import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addReviewComment,
  assignReviewer,
  saveRiskChecklist,
  transitionToolStatus,
} from '@/application/reviews/workflow';
import { saveDraft, submitTool } from '@/application/tools/register';
import type { Profile } from '@/domain/identity/types';
import { emptyChecklistItems } from '@/domain/tool/risk-checklist-rules';
import type { RiskChecklistItem } from '@/domain/tool/risk-checklist-rules';
import type { ToolId } from '@/domain/shared/ids';
import { getRepositories } from '@/lib/di/container';
import { emptyToolForm, type ToolFormInput } from '@/lib/validation/tool';
import { DEMO_CATEGORY_IDS } from '@/repositories/demo/seed-ids';
import { demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 승인 워크플로 (요구사항 19번의 3~6번 시나리오).
 *
 * 등록 신청 → 검토 배정 → 보완 요청 → 재신청 → 시범운영 → 정식 승인까지
 * 한 흐름으로 검증한다.
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

function completeForm(name: string): ToolFormInput {
  const form = emptyToolForm();
  return {
    ...form,
    name,
    summary: '테스트용 도구입니다.',
    categoryId: DEMO_CATEGORY_IDS.documentMeeting,
    description: '설명',
    problemStatement: '문제 설명',
    keyFeatures: ['기능 1'],
    currentWorkflow: '지금은 수작업',
    automatedWorkflow: '도구가 처리',
    inputData: '입력',
    outputData: '출력',
    classifications: form.classifications.map((entry) =>
      entry.classification === 'INTERNAL' ? { ...entry, inUse: true } : entry,
    ),
    dataStorageLocation: '교내 서버',
    dataRetentionPeriod: '6개월',
  };
}

/** 등록 신청까지 마친 도구를 만든다. */
async function submittedTool(developer: Profile, name = '검토 대상 도구'): Promise<ToolId> {
  const form = completeForm(name);
  const { toolId } = await saveDraft(developer, { form });
  await submitTool(developer, { toolId, form });
  return toolId;
}

function lowRiskItems(): RiskChecklistItem[] {
  return emptyChecklistItems();
}

/** 중대 위험 후보 2개를 체크해 CRITICAL 근거를 만든다. */
function criticalItems(): RiskChecklistItem[] {
  return emptyChecklistItems().map((item) =>
    item.code === 'USES_SENSITIVE_RECORDS' || item.code === 'STORES_OVERSEAS'
      ? { ...item, applies: true, note: '통제 미비' }
      : item,
  );
}

describe('검토 배정', () => {
  it('검토자가 맡으면 상태가 담당자 검토로 넘어간다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);

    await assignReviewer(reviewer, toolId);

    const tool = await getRepositories().tools.getTool(toolId);
    expect(tool?.status).toBe('HUMAN_REVIEW');

    const assignment = await getRepositories().reviews.getAssignmentForVersion(
      tool!.currentVersionId,
    );
    expect(assignment?.reviewerUserId).toBe(reviewer.id);
    expect(assignment?.status).toBe('IN_PROGRESS');
  });

  it('검토자는 남에게 배정할 수 없다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const admin = await demoProfile('admin');
    const toolId = await submittedTool(developer);

    await expect(assignReviewer(reviewer, toolId, admin.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('관리자는 검토자에게 배정할 수 있다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const admin = await demoProfile('admin');
    const toolId = await submittedTool(developer);

    const assignment = await assignReviewer(admin, toolId, reviewer.id);
    expect(assignment.reviewerUserId).toBe(reviewer.id);
  });

  it('검토자 역할이 아닌 사람에게는 배정할 수 없다', async () => {
    const developer = await demoProfile('developer');
    const admin = await demoProfile('admin');
    const requester = await demoProfile('requester');
    const toolId = await submittedTool(developer);

    await expect(assignReviewer(admin, toolId, requester.id)).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('임시저장 상태에는 배정할 수 없다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const { toolId } = await saveDraft(developer, {
      form: { ...emptyToolForm(), name: '아직 신청 안 함' },
    });

    await expect(assignReviewer(reviewer, toolId)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('보완 요청과 재신청 (요구사항 19번 3~4)', () => {
  it('검토자가 보완을 요청하면 개발자가 수정해 다시 신청할 수 있다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const repositories = getRepositories();

    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);

    await transitionToolStatus(reviewer, {
      toolId,
      toStatus: 'REVISION_REQUIRED',
      reason: '보관기간이 구체적이지 않습니다.',
      reviewComment: '보관기간을 개월 단위로 명시해 주세요.',
    });

    expect((await repositories.tools.getTool(toolId))?.status).toBe('REVISION_REQUIRED');

    // 보완 요청 상태에서는 개발자가 다시 수정할 수 있다.
    const revised = { ...completeForm('검토 대상 도구'), dataRetentionPeriod: '3개월 후 자동 파기' };
    await saveDraft(developer, { toolId, form: revised });
    await submitTool(developer, { toolId, form: revised, note: '보관기간을 3개월로 명시했습니다.' });

    const tool = await repositories.tools.getTool(toolId);
    expect(tool?.status).toBe('SUBMITTED');

    const history = await repositories.tools.listStatusHistory(toolId);
    const statuses = history.map((entry) => entry.toStatus);
    expect(statuses).toContain('REVISION_REQUIRED');
    // 재신청 사유가 이력에 남는다.
    const resubmit = history.find(
      (entry) => entry.toStatus === 'SUBMITTED' && entry.fromStatus === 'REVISION_REQUIRED',
    );
    expect(resubmit?.reason).toContain('3개월');
  });

  it('개발자는 스스로 시범운영으로 넘길 수 없다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);
    await saveRiskChecklist(reviewer, {
      toolId,
      items: lowRiskItems(),
      riskLevel: 'LOW',
      rationale: '민감정보를 다루지 않습니다.',
    });

    await expect(
      transitionToolStatus(developer, {
        toolId,
        toStatus: 'PILOT',
        reason: '제가 직접 승인하겠습니다.',
        reviewComment: '',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('위험 체크리스트와 승인 (요구사항 15번, 19번 5~6)', () => {
  it('체크리스트 없이는 시범운영으로 넘어갈 수 없다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);

    await expect(
      transitionToolStatus(reviewer, {
        toolId,
        toStatus: 'PILOT',
        reason: '문제없어 보입니다.',
        reviewComment: '',
      }),
    ).rejects.toThrowError(/체크리스트/);
  });

  it('CRITICAL 로 확정하면 시범운영이 막힌다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);

    await saveRiskChecklist(reviewer, {
      toolId,
      items: criticalItems(),
      riskLevel: 'CRITICAL',
      rationale: '성적 정보를 해외 서버에 저장합니다.',
    });

    await expect(
      transitionToolStatus(reviewer, {
        toolId,
        toStatus: 'PILOT',
        reason: '일단 시범운영해 봅시다.',
        reviewComment: '',
      }),
    ).rejects.toThrowError(/매우 높음/);
  });

  it('체크리스트를 저장하면 시범운영 → 정식 승인까지 진행된다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const admin = await demoProfile('admin');
    const repositories = getRepositories();

    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);
    await saveRiskChecklist(reviewer, {
      toolId,
      items: lowRiskItems(),
      riskLevel: 'LOW',
      rationale: '내부정보만 다루고 사람이 최종 확인합니다.',
    });

    await transitionToolStatus(reviewer, {
      toolId,
      toStatus: 'PILOT',
      reason: '위험 요소가 낮아 시범운영을 승인합니다.',
      reviewComment: '',
    });
    expect((await repositories.tools.getTool(toolId))?.status).toBe('PILOT');

    // 시범운영으로 넘어가면 검토 배정이 완료 처리된다.
    const tool = await repositories.tools.getTool(toolId);
    const assignment = await repositories.reviews.getAssignmentForVersion(tool!.currentVersionId);
    expect(assignment?.status).toBe('COMPLETED');
    expect(assignment?.completedAt).not.toBeNull();

    // 정식 승인은 관리자만 할 수 있다.
    await expect(
      transitionToolStatus(reviewer, {
        toolId,
        toStatus: 'APPROVED',
        reason: '정식 승인합니다.',
        reviewComment: '',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await transitionToolStatus(admin, {
      toolId,
      toStatus: 'APPROVED',
      reason: '시범운영 결과가 양호해 정식 승인합니다.',
      reviewComment: '',
    });
    expect((await repositories.tools.getTool(toolId))?.status).toBe('APPROVED');
  });

  it('사용 중지와 폐기는 관리자만 할 수 있다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const admin = await demoProfile('admin');
    const repositories = getRepositories();

    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);
    await saveRiskChecklist(reviewer, {
      toolId,
      items: lowRiskItems(),
      riskLevel: 'LOW',
      rationale: '위험 요소 없음',
    });
    await transitionToolStatus(reviewer, {
      toolId,
      toStatus: 'PILOT',
      reason: '시범운영을 승인합니다.',
      reviewComment: '',
    });
    await transitionToolStatus(admin, {
      toolId,
      toStatus: 'APPROVED',
      reason: '정식 승인합니다.',
      reviewComment: '',
    });

    await expect(
      transitionToolStatus(reviewer, {
        toolId,
        toStatus: 'SUSPENDED',
        reason: '문제가 발견되었습니다.',
        reviewComment: '',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await transitionToolStatus(admin, {
      toolId,
      toStatus: 'SUSPENDED',
      reason: '개인정보 처리 문제가 확인되어 중지합니다.',
      reviewComment: '',
    });
    expect((await repositories.tools.getTool(toolId))?.status).toBe('SUSPENDED');
  });

  it('상태 변경 이유가 5자 미만이면 거부한다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);

    await expect(
      transitionToolStatus(reviewer, {
        toolId,
        toStatus: 'REVISION_REQUIRED',
        reason: '별로',
        reviewComment: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('검토 의견', () => {
  it('검토자는 의견을 남길 수 있고 개발자는 남길 수 없다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);

    const comment = await addReviewComment(
      reviewer,
      toolId,
      'REVISION_REQUEST',
      '보관기간을 구체적으로 적어 주세요.',
    );
    expect(comment.authorUserId).toBe(reviewer.id);

    await expect(
      addReviewComment(developer, toolId, 'GENERAL', '제가 의견을 남깁니다.'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('상태가 바뀌면 담당자에게 알림이 간다', async () => {
    const developer = await demoProfile('developer');
    const reviewer = await demoProfile('reviewer');
    const toolId = await submittedTool(developer);
    await assignReviewer(reviewer, toolId);

    await transitionToolStatus(reviewer, {
      toolId,
      toStatus: 'REVISION_REQUIRED',
      reason: '보완이 필요합니다.',
      reviewComment: '',
    });

    const notifications = await getRepositories().observability.listNotifications(
      developer.id,
      true,
    );
    expect(notifications.some((item) => item.kind === 'REVISION_REQUESTED')).toBe(true);
    // 알림 본문에 사유 원문을 담지 않는다 — 목록에 오래 남기 때문이다.
    expect(notifications.every((item) => !item.body.includes('보완이 필요합니다'))).toBe(true);
  });
});
