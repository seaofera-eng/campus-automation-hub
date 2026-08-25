import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { submitEvaluation, updateEvaluation } from '@/application/evaluations/submit';
import {
  createImprovement,
  transitionImprovement,
} from '@/application/improvements/workflow';
import type { EvaluationScores } from '@/domain/evaluation/types';
import { getRepositories } from '@/lib/di/container';
import { DEMO_TOOL_IDS } from '@/repositories/demo/seed-ids';
import { demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 평가와 개선 요청 (요구사항 9번, 19번 8~9번 시나리오).
 */

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

function scores(value: number): EvaluationScores {
  return {
    overall: value,
  };
}

/** 시드에 평가가 아직 없는 승인 도구. */
const APPROVED_TOOL = DEMO_TOOL_IDS.excelAggregation;
/** 시드의 임시저장 도구. */
const DRAFT_TOOL = DEMO_TOOL_IDS.inquiryClassifier;

describe('평가 등록', () => {
  it('승인된 도구를 평가할 수 있다', async () => {
    const requester = await demoProfile('requester2');
    const evaluation = await submitEvaluation(requester, {
      toolId: APPROVED_TOOL,
      scores: scores(4),
      comment: '엑셀 취합이 훨씬 빨라졌습니다.',
    });

    expect(evaluation.scores.overall).toBe(4);
    expect(evaluation.revisionCount).toBe(0);
    expect(evaluation.evaluatorUserId).toBe(requester.id);
  });

  it('임시저장 상태의 도구는 평가할 수 없다 (요구사항 9번)', async () => {
    const requester = await demoProfile('requester2');
    await expect(
      submitEvaluation(requester, { toolId: DRAFT_TOOL, scores: scores(4), comment: '' }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('같은 사용자가 같은 버전을 중복 평가할 수 없다', async () => {
    const requester = await demoProfile('requester2');
    const input = { toolId: APPROVED_TOOL, scores: scores(4), comment: '' };

    await submitEvaluation(requester, input);
    await expect(submitEvaluation(requester, input)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('다른 사용자는 같은 버전을 평가할 수 있다', async () => {
    const first = await demoProfile('requester2');
    const second = await demoProfile('developer2');
    const input = { toolId: APPROVED_TOOL, scores: scores(4), comment: '' };

    await submitEvaluation(first, input);
    await expect(submitEvaluation(second, input)).resolves.toBeTruthy();
  });

  it('범위를 벗어난 점수는 거부한다', async () => {
    const requester = await demoProfile('requester2');
    await expect(
      submitEvaluation(requester, { toolId: APPROVED_TOOL, scores: scores(6), comment: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('평가 수정과 이력', () => {
  it('수정하면 이전 값이 이력에 남고 수정 횟수가 올라간다', async () => {
    const requester = await demoProfile('requester2');
    const repositories = getRepositories();

    const created = await submitEvaluation(requester, {
      toolId: APPROVED_TOOL,
      scores: scores(3),
      comment: '처음에는 보통이었습니다.',
    });

    const updated = await updateEvaluation(requester, {
      evaluationId: created.id,
      scores: scores(5),
      comment: '익숙해지니 훨씬 좋습니다.',
    });

    expect(updated.scores.overall).toBe(5);
    expect(updated.revisionCount).toBe(1);

    const history = await repositories.evaluations.listHistory(created.id);
    expect(history).toHaveLength(1);
    // 이력에는 **바뀌기 전** 값이 남는다.
    expect(history[0]?.previousScores.overall).toBe(3);
    expect(history[0]?.previousComment).toBe('처음에는 보통이었습니다.');
    expect(history[0]?.changedBy).toBe(requester.id);
  });

  it('남의 평가는 수정할 수 없다', async () => {
    const owner = await demoProfile('requester2');
    const other = await demoProfile('developer2');

    const created = await submitEvaluation(owner, {
      toolId: APPROVED_TOOL,
      scores: scores(4),
      comment: '',
    });

    await expect(
      updateEvaluation(other, { evaluationId: created.id, scores: scores(1), comment: '별로' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  /**
   * 관리 권한은 운영 권한이지 저작 권한이 아니다.
   * 평가는 사람에 대한 판단이 섞이는 글이라 남이 고쳐서는 안 된다.
   */
  it('남이 쓴 평가는 관리자도 수정할 수 없다', async () => {
    const owner = await demoProfile('requester2');
    const admin = await demoProfile('admin');

    const created = await submitEvaluation(owner, {
      toolId: APPROVED_TOOL,
      scores: scores(4),
      comment: '',
    });

    await expect(
      updateEvaluation(admin, {
        evaluationId: created.id,
        scores: scores(2),
        comment: '내용 정정',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('개선 요청 등록', () => {
  it('누구나 개선을 요청할 수 있다', async () => {
    const requester = await demoProfile('requester');
    const request = await createImprovement(requester, {
      toolId: APPROVED_TOOL,
      title: '결과 파일명에 날짜 추가',
      requestType: 'USABILITY',
      detail: '파일이 매번 같은 이름이라 덮어써집니다.',
      businessImpact: 'MEDIUM',
      urgency: 'LOW',
    });

    expect(request.status).toBe('OPEN');
    // 등록되는 순간 도구를 만든 사람에게 자동으로 붙는다 (리뷰 8.2절).
    expect(request.assignedDeveloperUserId).not.toBeNull();
  });

  it('도구 담당자에게 알림이 간다', async () => {
    const requester = await demoProfile('requester');
    const repositories = getRepositories();

    await createImprovement(requester, {
      toolId: APPROVED_TOOL,
      title: '알림 확인용 요청',
      requestType: 'BUG_FIX',
      detail: '알림이 가는지 확인합니다.',
      businessImpact: 'LOW',
      urgency: 'LOW',
    });

    const tool = await repositories.tools.getTool(APPROVED_TOOL);
    const notifications = await repositories.observability.listNotifications(
      tool!.ownerUserId,
      true,
    );
    expect(notifications.some((item) => item.title.includes('개선 요청'))).toBe(true);
  });
});

describe('개선 요청 처리 흐름', () => {
  async function openRequest() {
    const requester = await demoProfile('requester');
    return createImprovement(requester, {
      toolId: APPROVED_TOOL,
      title: '처리 흐름 확인용',
      requestType: 'NEW_FEATURE',
      detail: '상태 전환을 확인합니다.',
      businessImpact: 'HIGH',
      urgency: 'HIGH',
    });
  }

  it('검토자가 검토 → 확정까지 진행할 수 있다', async () => {
    const reviewer = await demoProfile('reviewer');
    const request = await openRequest();

    await transitionImprovement(reviewer, {
      improvementId: request.id,
      toStatus: 'REVIEWING',
      comment: '검토를 시작합니다.',
    });
    await transitionImprovement(reviewer, {
      improvementId: request.id,
      toStatus: 'ACCEPTED',
      comment: '다음 버전에 반영하겠습니다.',
    });

    const updated = await getRepositories().improvements.getById(request.id);
    expect(updated?.status).toBe('ACCEPTED');

    const history = await getRepositories().improvements.listHistory(request.id);
    expect(history.map((entry) => entry.toStatus)).toContain('REVIEWING');
    expect(history.map((entry) => entry.toStatus)).toContain('ACCEPTED');
  });

  it('배정되지 않은 개발자는 상태를 바꿀 수 없다', async () => {
    const developer = await demoProfile('developer2');
    const request = await openRequest();

    await expect(
      transitionImprovement(developer, {
        improvementId: request.id,
        toStatus: 'REVIEWING',
        comment: '',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  /**
   * 개선 요청은 등록되는 순간 도구를 만든 사람에게 자동으로 붙는다.
   * 따로 배정하는 절차를 두지 않는다 (리뷰 8.2절).
   */
  it('도구를 만든 사람이 자동으로 담당자가 되어 처리 단계를 진행할 수 있다', async () => {
    const developer = await demoProfile('developer');
    const request = await openRequest();

    expect(request.assignedDeveloperUserId).toBe(developer.id);

    await expect(
      transitionImprovement(developer, {
        improvementId: request.id,
        toStatus: 'REVIEWING',
        comment: '제가 보겠습니다.',
      }),
    ).resolves.toBe('REVIEWING');
  });

  it('요청자는 자기 요청을 철회할 수 있다', async () => {
    const requester = await demoProfile('requester');
    const request = await openRequest();

    await transitionImprovement(requester, {
      improvementId: request.id,
      toStatus: 'CLOSED',
      comment: '다른 방법을 찾았습니다.',
    });

    expect((await getRepositories().improvements.getById(request.id))?.status).toBe('CLOSED');
  });

  it('요청자가 스스로 반영 확정을 할 수는 없다', async () => {
    const requester = await demoProfile('requester');
    const reviewer = await demoProfile('reviewer');
    const request = await openRequest();

    await transitionImprovement(reviewer, {
      improvementId: request.id,
      toStatus: 'REVIEWING',
      comment: '',
    });

    await expect(
      transitionImprovement(requester, {
        improvementId: request.id,
        toStatus: 'ACCEPTED',
        comment: '반영해 주세요.',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('단계를 건너뛸 수 없다', async () => {
    const reviewer = await demoProfile('reviewer');
    const request = await openRequest();

    await expect(
      transitionImprovement(reviewer, {
        improvementId: request.id,
        toStatus: 'RELEASED',
        comment: '',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
  });
});
