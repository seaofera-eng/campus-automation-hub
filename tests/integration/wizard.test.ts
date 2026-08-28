import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as CurrentUserModule from '@/lib/auth/current-user';
import { buildDemandDraft, suggestTools } from '@/application/wizard/suggest';
import { saveDemandDraft } from '@/application/demands/register';
import { demandPublishSchema } from '@/lib/validation/demand';
import { emptyDemandForm } from '@/lib/validation/demand';
import type { WizardAnswers } from '@/domain/wizard';
import { emptyWizardAnswers } from '@/domain/wizard';
import { sampleWizardAnswers } from '@/lib/demo/samples';
import { demoProfile, setupIsolatedStore, teardownIsolatedStore } from './helpers';

/**
 * 맞춤 AI 찾기 마법사 (리뷰 2026-08-26 2절).
 *
 * ## 여기서 지키는 것
 *
 * 1. **모델 없이도 끝까지 간다.** 테스트 환경에는 API 키가 없다. 그 상태에서
 *    초안이 나오고, 그 초안이 실제로 공개 기준을 통과해야 한다.
 * 2. **추천이 없으면 빈 목록이다.** 억지로 채우지 않는다.
 * 3. **추천에 쓸 수 없는 도구가 섞이지 않는다.** 임시저장·폐기된 도구를
 *    추천하면 눌러도 못 쓴다.
 */

vi.mock('@/lib/auth/current-user', async () => {
  const actual = await vi.importActual<typeof CurrentUserModule>('@/lib/auth/current-user');
  return {
    ...actual,
    requireUser: async () => {
      const { getRepositories } = await import('@/lib/di/container');
      const { DEMO_USER_IDS } = await import('@/repositories/demo/seed-ids');
      const profile = await getRepositories().identity.getProfile(DEMO_USER_IDS.requester);
      if (!profile) throw new Error('데모 계정을 찾을 수 없습니다.');
      return profile;
    },
  };
});

beforeEach(setupIsolatedStore);
afterEach(teardownIsolatedStore);

function answers(overrides: Partial<WizardAnswers> = {}): WizardAnswers {
  return {
    ...emptyWizardAnswers(),
    taskKind: 'SUMMARIZE',
    inputKinds: ['AUDIO'],
    outputKinds: ['SUMMARY'],
    frequency: 'WEEKLY',
    ...overrides,
  };
}

describe('초안 만들기', () => {
  it('키가 없어도 초안이 나온다', async () => {
    const result = await buildDemandDraft(answers());

    expect(result.draft.source).toBe('RULES');
    expect(result.model).toBeNull();
    // 키가 아예 없는 것과 모델이 실패한 것은 다르다. 화면 문구가 달라진다.
    expect(result.modelFailed).toBe(false);
  });

  it('초안이 수요 공개 기준을 그대로 통과한다', async () => {
    const { draft } = await buildDemandDraft(answers({ constraints: ['PERSONAL_DATA'] }));

    const form = {
      ...emptyDemandForm(),
      title: draft.title,
      currentWorkDescription: draft.currentWorkDescription,
      mostPainfulStep: draft.mostPainfulStep,
      inputMaterials: draft.inputMaterials,
      desiredOutcome: draft.desiredOutcome,
      workFrequency: draft.frequency,
      requiredFeatures: draft.requiredFeatures,
      expectedBenefit: draft.expectedBenefit,
      containsIdentifiablePersonalData: draft.containsIdentifiablePersonalData,
      containsAcademicOrResearchData: draft.containsAcademicOrResearchData,
      requiresHumanApproval: draft.requiresHumanApproval,
    };

    // 마법사를 끝까지 갔는데 공개 버튼이 막히면 안 된다.
    expect(demandPublishSchema.safeParse(form).success).toBe(true);
  });

  it('초안을 그대로 수요로 저장할 수 있다', async () => {
    const actor = await demoProfile('requester');
    const { draft } = await buildDemandDraft(answers());

    const saved = await saveDemandDraft(actor, {
      form: {
        ...emptyDemandForm(),
        title: draft.title,
        currentWorkDescription: draft.currentWorkDescription,
        mostPainfulStep: draft.mostPainfulStep,
        desiredOutcome: draft.desiredOutcome,
        workFrequency: draft.frequency,
        requiredFeatures: draft.requiredFeatures,
      },
    });

    expect(saved.created).toBe(true);
  });
});

describe('비슷한 도구 찾기', () => {
  it('모델을 부르지 않고 즉시 답한다', async () => {
    const result = await suggestTools(answers());
    expect(result.comparedCount).toBeGreaterThan(0);
  });

  it('쓸 수 있는 도구만 추천한다', async () => {
    const { getRepositories } = await import('@/lib/di/container');
    const repositories = getRepositories();
    const result = await suggestTools(answers());

    for (const suggestion of result.tools) {
      const tool = await repositories.tools.getTool(
        suggestion.toolId as Parameters<typeof repositories.tools.getTool>[0],
      );
      expect(tool).not.toBeNull();
      // 임시저장·검토 중·폐기된 도구를 추천하면 눌러도 못 쓴다.
      expect(['PILOT', 'APPROVED']).toContain(tool?.status);
    }
  });

  it('관계없는 내용에는 억지로 도구를 채우지 않는다', async () => {
    // 데모 도구 어느 것과도 겹치지 않는 조합.
    const result = await suggestTools(
      answers({ taskKind: 'ANSWER', inputKinds: ['IMAGE'], outputKinds: ['CHART'] }),
    );

    // 있으면 상위 3개까지, 없으면 빈 목록. 어느 쪽이든 개수 상한은 지킨다.
    expect(result.tools.length).toBeLessThanOrEqual(3);
  });

  it('평가가 없는 도구를 0점으로 만들지 않는다', async () => {
    const result = await suggestTools(answers());

    for (const suggestion of result.tools) {
      if (suggestion.evaluationCount === 0) {
        expect(suggestion.averageOverallScore).toBeNull();
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 시연 예시가 실제로 도구를 찾아내는가                                        */
/* -------------------------------------------------------------------------- */

/**
 * 이 묶음이 없어서 결함을 놓쳤다.
 *
 * 처음 만들 때 "관계없는 답에는 억지로 채우지 않는다"만 확인하고 **"맞는
 * 답에는 실제로 찾아내는가"를 확인하지 않았다.** 그래서 추천이 항상 0건인
 * 채로 테스트가 통과했다.
 *
 * 원인은 마법사 답이 선택지 라벨("녹음·영상")이고 도구 설명은 사람이 쓴
 * 문장("회의 녹취록 텍스트")이라 글자가 만날 수 없었던 것이다.
 * 선택지마다 검색어를 붙이고, 길이 차이에 벌점이 없는 계산으로 바꿔서 고쳤다.
 */
describe('시연용 예시 답', () => {
  it('회의록 도구를 찾아낸다', async () => {
    const result = await suggestTools(sampleWizardAnswers());

    expect(result.tools.length).toBeGreaterThan(0);
    // 시연에서 "이미 이런 도구가 있습니다"가 나와야 마법사의 값어치가 드러난다.
    expect(result.tools[0]?.name).toContain('회의록');
  });

  it('관계없는 답에는 여전히 아무것도 주지 않는다', async () => {
    // 문턱을 낮춰서 맞춘 것이 아니라는 확인. 이쪽이 무너지면 추천을 못 믿는다.
    const result = await suggestTools(
      answers({ taskKind: 'ANSWER', inputKinds: ['IMAGE'], outputKinds: ['CHART'] }),
    );
    expect(result.tools).toEqual([]);
  });
});
